import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffProfileDto } from './dto/create-staff-profile.dto';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { FindAllStaffProfilesDto } from './dto/find-all-staff-profiles.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class StaffProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStaffProfileDto, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user)
      throw new NotFoundException(`User with ID ${dto.userId} not found`);

    // Ruxsat etilgan rollarni aniq UserRole[] turi bilan belgilaymiz
    const allowedRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PLATFORM_ADMIN,
    ];

    if (!allowedRoles.includes(user.role)) {
      throw new ConflictException(
        'Staff profile can only be created for ADMIN, MANAGER, or PLATFORM_ADMIN roles',
      );
    }

    // Tenant Isolation
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot create a profile for a staff member outside your organization',
      );
    }

    const existingProfile = await this.prisma.staffProfile.findUnique({
      where: { userId: dto.userId },
    });

    if (existingProfile) {
      throw new ConflictException(
        `Staff profile for User ID ${dto.userId} already exists`,
      );
    }

    return this.prisma.staffProfile.create({
      data: dto,
    });
  }

  async findAll(query: FindAllStaffProfilesDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, search, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.user = { tenantId: currentUser.tenantId };
    } else if (tenantId) {
      where.user = { tenantId };
    }

    // Search functionality
    if (search) {
      where.OR = [
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              isActive: true,
              photoUrl: true,
            },
          },
        },
        orderBy: { user: { createdAt: 'desc' } },
      }),
      this.prisma.staffProfile.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(userId: number, currentUser: JwtPayload) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            tenantId: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!profile)
      throw new NotFoundException(
        `Staff profile for User ID ${userId} not found`,
      );

    // Authorization checks
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      profile.user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'This staff member does not belong to your organization',
      );
    }

    return profile;
  }

  async update(
    userId: number,
    dto: UpdateStaffProfileDto,
    currentUser: JwtPayload,
  ) {
    const profile = await this.findOne(userId, currentUser); // Reuses isolation check

    const updateData: any = { ...dto };

    // STRICT SECURITY: An ADMIN cannot change their own salary or KPIs.
    // Only a MANAGER or PLATFORM_ADMIN can update financial fields.
    if (
      currentUser.role === UserRole.ADMIN ||
      (currentUser.role === UserRole.MANAGER && currentUser.sub === userId)
    ) {
      delete updateData.fixedSalary;
      delete updateData.kpiPercent;
    }

    // Use upsert to handle case where profile might not exist
    return this.prisma.staffProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });
  }

  async remove(userId: number, currentUser: JwtPayload) {
    const profile = await this.findOne(userId, currentUser); // Security check

    // Prevent staff from deleting their own profile
    if (currentUser.sub === userId) {
      throw new ForbiddenException('You cannot delete your own staff profile');
    }

    return this.prisma.staffProfile.delete({
      where: { userId },
    });
  }
}
