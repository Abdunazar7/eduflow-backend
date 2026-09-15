import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherProfileDto } from './dto/create-teacher-profile.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import { FindAllTeacherProfilesDto } from './dto/find-all-teacher-profiles.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class TeacherProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeacherProfileDto, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.TEACHER) {
      throw new ConflictException(
        'Profile can only be created for users with TEACHER role',
      );
    }

    // Tenant isolation check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot create a profile for a teacher outside your organization',
      );
    }

    const existingProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: dto.userId },
    });
    if (existingProfile)
      throw new ConflictException('Teacher profile already exists');

    return this.prisma.teacherProfile.create({
      data: {
        ...dto,
        hiredDate: dto.hiredDate ? new Date(dto.hiredDate) : new Date(),
      },
    });
  }

  async findAll(query: FindAllTeacherProfilesDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, search, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.user = { tenantId: currentUser.tenantId };
    } else if (tenantId) {
      where.user = { tenantId };
    }

    // Search functionality across related User fields and Profile fields
    if (search) {
      where.OR = [
        { specialization: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where,
        skip,
        take: limit,
        // Bu yerdan _count olib tashlandi, chunki TeacherProfile da massiv (array) relation yo'q
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
              photoUrl: true,
            },
          },
        },
      }),
      this.prisma.teacherProfile.count({ where }),
    ]);

    // O'qituvchining nechta aktiv guruhi borligini sanash (Dashboard uchun)
    const enhancedData = await Promise.all(
      data.map(async (profile) => {
        const activeGroupsCount = await this.prisma.group.count({
          where: { teacherId: profile.userId, status: 'active' },
        });
        return { ...profile, activeGroupsCount };
      }),
    );

    return {
      data: enhancedData,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: number, currentUser: JwtPayload) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            tenantId: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!profile)
      throw new NotFoundException(
        `Teacher profile for User ID ${userId} not found`,
      );

    // Authorization checks
    if (currentUser.role === UserRole.TEACHER && currentUser.sub !== userId) {
      throw new ForbiddenException(
        'You can only view your own profile details',
      );
    } else if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.role !== UserRole.TEACHER &&
      profile.user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'This teacher does not belong to your organization',
      );
    }

    return profile;
  }

  async update(
    userId: number,
    dto: UpdateTeacherProfileDto,
    currentUser: JwtPayload,
  ) {
    await this.findOne(userId, currentUser); // Reuse security checks from findOne

    const updateData: any = { ...dto };

    // STRICT SECURITY: A teacher cannot change their own salary, hired date, or title
    if (currentUser.role === UserRole.TEACHER) {
      delete updateData.salaryType;
      delete updateData.salaryValue;
      delete updateData.hiredDate;
      delete updateData.title;
    }

    if (updateData.hiredDate) {
      updateData.hiredDate = new Date(updateData.hiredDate);
    }

    // Use upsert to handle case where profile might not exist
    return this.prisma.teacherProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });
  }

  async remove(userId: number, currentUser: JwtPayload) {
    await this.findOne(userId, currentUser); // Security check

    return this.prisma.teacherProfile.delete({
      where: { userId },
    });
  }
}
