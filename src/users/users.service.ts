import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from '../commons/types';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { normalizePhone } from '../commons/utils/phone';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Centralized Helper for Hierarchical Role Checking
  private isRoleAuthorized(
    currentUserRole: UserRole,
    targetUserRole: UserRole,
  ): boolean {
    const roleLevels: Record<UserRole, number> = {
      [UserRole.PLATFORM_ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.ADMIN]: 2,
      [UserRole.TEACHER]: 1,
      [UserRole.STUDENT]: 0,
    };

    const currentUserLevel = roleLevels[currentUserRole];
    const targetUserLevel = roleLevels[targetUserRole];

    // Platform Admin can do anything. Others can only manage roles lower than theirs.
    if (currentUserRole === UserRole.PLATFORM_ADMIN) return true;
    return currentUserLevel > targetUserLevel;
  }

  async create(dto: CreateUserDto, currentUser: JwtPayload) {
    // 1. Hierarchical Check: Can the current user create a user with this specific role?
    if (!this.isRoleAuthorized(currentUser.role, dto.role)) {
      throw new ForbiddenException(
        `You do not have permission to create a user with the role: ${dto.role}`,
      );
    }

    // 2. Tenant assignment logic
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    if (!targetTenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const phone = normalizePhone(dto.phone);
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing)
      throw new ConflictException('Phone number already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    // telegramChatId is not a User column; accepted by the DTO for older clients only.
    const { password, telegramChatId, ...userData } = dto;

    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          phone,
          passwordHash,
          tenantId: targetTenantId, // Assign to the correct tenant
          isActive: true, // Admin yaratganda default active
        },
      });

      await this.createProfile(tx, user.id, user.role);
      return user;
    });
  }

  async toggleActive(targetUserId: number, currentUser: JwtPayload) {
    // 1. Target userni topamiz
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // O'zini o'zi bloklay olmasligi kerak
    if (currentUser.sub === targetUserId) {
      throw new ForbiddenException(
        "O'z profilingiz holatini o'zgartira olmaysiz",
      );
    }

    // 2. Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      if (targetUser.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException(
          "Boshqa o'quv markazi foydalanuvchisini o'zgartira olmaysiz",
        );
      }
    }

    // 3. Ierarxiya tekshiruvi (Level orqali helper func ishlatamiz)
    if (!this.isRoleAuthorized(currentUser.role, targetUser.role)) {
      throw new ForbiddenException(
        "Sizdan yuqori yoki teng darajadagi foydalanuvchi holatini o'zgartira olmaysiz",
      );
    }

    const newStatus = !targetUser.isActive;

    // 4. Update mantiqi (Bloklansa refresh tokenni o'chiramiz - Force Logout)
    const updateData: any = { isActive: newStatus };

    if (!newStatus) {
      updateData.hashedRt = null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return {
      message: newStatus
        ? 'Foydalanuvchi muvaffaqiyatli faollashtirildi'
        : 'Foydalanuvchi tizimdan bloklandi (va barcha qurilmalardan chiqarildi)',
      user: updatedUser,
    };
  }

  private async createProfile(tx: any, userId: number, role: UserRole) {
    if (role === UserRole.STUDENT) {
      await tx.studentProfile.create({ data: { userId } });
    } else if (role === UserRole.TEACHER) {
      await tx.teacherProfile.create({
        data: { userId, salaryType: 'PERCENT', salaryValue: 0 },
      });
    } else if (
      [UserRole.ADMIN, UserRole.MANAGER, UserRole.PLATFORM_ADMIN].includes(role)
    ) {
      await tx.staffProfile.create({ data: { userId } });
    }
  }

  async findAll(query: FindAllUsersDto, currentUser: JwtPayload) {
    const { tenantId, page = 1, limit = 10, role } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // 1. Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId; // Managers/Admins only see their own school
    } else if (tenantId !== undefined) {
      where.tenantId = tenantId; // Platform Admin can filter by tenant
    }

    // 2. Role constraints for visibility
    if (currentUser.role === UserRole.TEACHER) {
      // If a teacher accesses this, force the query to only show students
      // (You could further restrict this to only students in *their* groups, but filtering to STUDENT is a safe baseline)
      where.role = UserRole.STUDENT;
    } else if (role) {
      where.role = role;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          tenantId: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
        staffProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Tenant Check: Users can view themselves, OR they must be in the same tenant (unless Platform Admin)
    if (
      currentUser.sub !== id &&
      currentUser.role !== UserRole.PLATFORM_ADMIN
    ) {
      if (user.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException(
          'You do not have permission to view this user profile',
        );
      }
    }

    return user;
  }

  async updateRole(id: number, newRole: UserRole, currentUser: JwtPayload) {
    const user = await this.findOne(id, currentUser); // Reuses the security checks

    // Hierarchical Check: Can the current user assign this new role?
    if (!this.isRoleAuthorized(currentUser.role, newRole)) {
      throw new ForbiddenException(
        `You do not have permission to assign the role: ${newRole}`,
      );
    }

    // Hierarchical Check: Can the current user modify the target user's current role?
    if (!this.isRoleAuthorized(currentUser.role, user.role)) {
      throw new ForbiddenException(
        "You do not have permission to modify this user's role",
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.studentProfile.deleteMany({ where: { userId: id } });
      await tx.teacherProfile.deleteMany({ where: { userId: id } });
      await tx.staffProfile.deleteMany({ where: { userId: id } });

      const updatedUser = await tx.user.update({
        where: { id },
        data: { role: newRole },
      });

      await this.createProfile(tx, id, newRole);
      return updatedUser;
    });
  }

  async update(id: number, dto: UpdateUserDto, currentUser: JwtPayload) {
    const user = await this.findOne(id, currentUser); // Initial View Security Check

    // Self-update is allowed, otherwise check hierarchy
    if (
      currentUser.sub !== id &&
      !this.isRoleAuthorized(currentUser.role, user.role)
    ) {
      throw new ForbiddenException(
        "You do not have permission to update this user's details",
      );
    }

    const data: any = { ...dto };
    delete data.telegramChatId;

    if (typeof data.phone === 'string') {
      data.phone = normalizePhone(data.phone);
    }

    // Prevent Tenant Escaping: Only Platform Admins can change a user's Tenant ID
    if (
      dto.tenantId !== undefined &&
      currentUser.role !== UserRole.PLATFORM_ADMIN
    ) {
      delete data.tenantId;
    }

    // Prevent Role escalation via standard update (force them to use updateRole endpoint)
    if (data.role) {
      delete data.role;
    }

    if (dto.password) {
      // Changing your own password must prove you know the current one, so a
      // stolen access token cannot be turned into a permanent takeover.
      if (currentUser.sub === id) {
        throw new BadRequestException(
          'Use POST /users/change-password to change your own password.',
        );
      }
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      // An admin reset signs the user out of every device.
      data.hashedRt = null;
      delete data.password;
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: { passwordHash: false },
    });

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        hashedRt: null,
      },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async remove(id: number, currentUser: JwtPayload) {
    const user = await this.findOne(id, currentUser); // Initial view security check

    // Check Hierarchy: Cannot delete someone of equal or higher rank
    if (!this.isRoleAuthorized(currentUser.role, user.role)) {
      throw new ForbiddenException(
        'You do not have permission to delete this user',
      );
    }

    // Use a transaction to safely remove dependencies before the user
    return await this.prisma.$transaction(async (tx) => {
      // Clear out any OTPs related to this user
      await tx.otp.deleteMany({ where: { userId: id } });

      // Unlink the Telegram account (so we don't delete the user's chat ID entirely, just detach it)
      await tx.telegramAccount.updateMany({
        where: { userId: id },
        data: { userId: null },
      });

      // Note: StudentProfile, TeacherProfile, and StaffProfile have `onDelete: Cascade`
      // in your schema, so the database will handle deleting them automatically.

      // Finally, delete the user
      return tx.user.delete({ where: { id } });
    });
  }
}
