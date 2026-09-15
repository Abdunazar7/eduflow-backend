import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FindAllCoursesDto } from './dto/find-all-courses.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto, currentUser: JwtPayload) {
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    if (!targetTenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${targetTenantId} not found`);
    }

    return this.prisma.course.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
      },
    });
  }

  async findAll(query: FindAllCoursesDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, search, tenantId, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { levels: true }, // Count of levels for dashboard statistics
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        levels: {
          orderBy: { orderIndex: 'asc' },
          include: {
            _count: { select: { groups: true } }, // Show how many groups are in each level
          },
        },
        tenant: {
          select: { id: true, name: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Tenant authorization check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      course.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'This course does not belong to your organization',
      );
    }

    return course;
  }

  async update(id: number, dto: UpdateCourseDto, currentUser: JwtPayload) {
    const course = await this.findOne(id, currentUser); // Reuses the security check

    // Only platform admin can move a course to another tenant
    if (dto.tenantId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      delete dto.tenantId;
    }

    return this.prisma.course.update({
      where: { id: course.id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const course = await this.findOne(id, currentUser); // Security check

    // Relational Check: Prevent deleting a course if it has existing levels
    const levelsCount = await this.prisma.courseLevel.count({
      where: { courseId: course.id },
    });

    if (levelsCount > 0) {
      throw new BadRequestException(
        `Cannot delete this course because it has ${levelsCount} active level(s). Please delete or reassign the levels first.`,
      );
    }

    return this.prisma.course.delete({
      where: { id: course.id },
    });
  }
}
