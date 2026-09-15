import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseLevelDto } from './dto/create-course-level.dto';
import { UpdateCourseLevelDto } from './dto/update-course-level.dto';
import { FindAllCourseLevelsDto } from './dto/find-all-course-levels.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class CourseLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseLevelDto, currentUser: JwtPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    // Tenant Isolation Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      course.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot add levels to a course outside your organization',
      );
    }

    return this.prisma.courseLevel.create({
      data: dto,
    });
  }

  async findAll(query: FindAllCourseLevelsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, search, courseId, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation (checked via the parent Course)
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.course = { tenantId: currentUser.tenantId };
    } else if (tenantId) {
      where.course = { tenantId };
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.courseLevel.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ courseId: 'asc' }, { orderIndex: 'asc' }],
        include: {
          course: { select: { id: true, name: true, tenantId: true } },
          _count: {
            select: { groups: true }, // Dashboard statistic: how many groups are currently on this level
          },
        },
      }),
      this.prisma.courseLevel.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const courseLevel = await this.prisma.courseLevel.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, tenantId: true } },
        _count: { select: { groups: true } },
      },
    });

    if (!courseLevel) {
      throw new NotFoundException(`Course Level with ID ${id} not found`);
    }

    // Tenant Authorization Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      courseLevel.course.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'This course level does not belong to your organization',
      );
    }

    return courseLevel;
  }

  async update(id: number, dto: UpdateCourseLevelDto, currentUser: JwtPayload) {
    const courseLevel = await this.findOne(id, currentUser); // Reuses the security check

    // If they are trying to move this level to a different course, verify the new course belongs to their tenant
    if (dto.courseId && dto.courseId !== courseLevel.courseId) {
      const newCourse = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });

      if (!newCourse) throw new NotFoundException('New course not found');
      if (
        currentUser.role !== UserRole.PLATFORM_ADMIN &&
        newCourse.tenantId !== currentUser.tenantId
      ) {
        throw new ForbiddenException(
          'Cannot move this level to a course outside your organization',
        );
      }
    }

    return this.prisma.courseLevel.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const courseLevel = await this.findOne(id, currentUser); // Security check

    // Relational Check: Prevent deletion if groups are assigned to this level
    if (courseLevel._count.groups > 0) {
      throw new BadRequestException(
        `Cannot delete this course level because it has ${courseLevel._count.groups} active group(s). Please reassign them first.`,
      );
    }

    return this.prisma.courseLevel.delete({
      where: { id },
    });
  }
}
