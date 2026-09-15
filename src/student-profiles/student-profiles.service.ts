import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { FindAllStudentProfilesDto } from './dto/find-all-student-profiles.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class StudentProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentProfileDto, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.STUDENT) {
      throw new ConflictException(
        'Profile can only be created for users with STUDENT role',
      );
    }

    // Tenant isolation check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot create profile for a student outside your organization',
      );
    }

    const existingProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: dto.userId },
    });

    if (existingProfile) {
      throw new ConflictException(
        'Student profile already exists for this user',
      );
    }

    return this.prisma.studentProfile.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      },
    });
  }

  async findAll(query: FindAllStudentProfilesDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, search, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.user = { tenantId: currentUser.tenantId };
    } else if (tenantId) {
      where.user = { tenantId };
    }

    // Search functionality across related User fields
    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.studentProfile.findMany({
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
              isActive: true,
            },
          },
        },
      }),
      this.prisma.studentProfile.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(userId: number, currentUser: JwtPayload) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            tenantId: true,
          },
        },
      },
    });

    if (!profile)
      throw new NotFoundException(
        `Student profile for User ID ${userId} not found`,
      );

    // Authorization: A student can only view their own profile. Staff can view within their tenant.
    if (currentUser.role === UserRole.STUDENT && currentUser.sub !== userId) {
      throw new ForbiddenException('You can only view your own profile');
    } else if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.role !== UserRole.STUDENT &&
      profile.user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'This student does not belong to your organization',
      );
    }

    return profile;
  }

  async update(
    userId: number,
    dto: UpdateStudentProfileDto,
    currentUser: JwtPayload,
  ) {
    const profile = await this.findOne(userId, currentUser); // This also handles permissions checks

    const updateData: any = { ...dto };

    // Strict Security: A student cannot change their own balance or discount percent
    if (currentUser.role === UserRole.STUDENT) {
      delete updateData.balance;
      delete updateData.discountPercent;
      delete updateData.notes;
    }

    if (updateData.birthDate) {
      updateData.birthDate = new Date(updateData.birthDate);
    }

    // Use upsert to handle case where profile might not exist
    return this.prisma.studentProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });
  }

  async remove(userId: number, currentUser: JwtPayload) {
    const profile = await this.findOne(userId, currentUser); // Security check included

    return this.prisma.studentProfile.delete({
      where: { userId: profile.userId },
    });
  }
}
