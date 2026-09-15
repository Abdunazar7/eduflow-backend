import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { FindAllGroupsDto } from './dto/find-all-groups.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroupDto, currentUser: JwtPayload) {
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    if (!targetTenantId) throw new BadRequestException('Tenant ID is required');

    // 1. Validate Course Level & Tenant Ownership
    const courseLevel = await this.prisma.courseLevel.findUnique({
      where: { id: dto.courseLevelId },
      include: { course: true },
    });
    if (!courseLevel) throw new NotFoundException('Course Level not found');
    if (courseLevel.course.tenantId !== targetTenantId) {
      throw new ForbiddenException(
        'The selected Course Level belongs to another organization',
      );
    }

    // 2. Validate Main Teacher
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('Invalid Main Teacher');
    }
    if (teacher.tenantId !== targetTenantId) {
      throw new ForbiddenException(
        'The selected Teacher belongs to another organization',
      );
    }

    // 3. Validate Support Teacher (Optional)
    if (dto.supportTeacherId) {
      const supportTeacher = await this.prisma.user.findUnique({
        where: { id: dto.supportTeacherId },
      });
      if (
        !supportTeacher ||
        supportTeacher.role !== UserRole.TEACHER ||
        supportTeacher.tenantId !== targetTenantId
      ) {
        throw new BadRequestException('Invalid Support Teacher');
      }
    }

    // 4. Validate Branch and Room (Optional but must match tenant)
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch || branch.tenantId !== targetTenantId)
        throw new BadRequestException('Invalid Branch');
    }
    if (dto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomId },
        include: { branch: true },
      });
      if (!room || room.branch.tenantId !== targetTenantId)
        throw new BadRequestException('Invalid Room');
    }

    return this.prisma.group.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async findAll(query: FindAllGroupsDto, currentUser: JwtPayload) {
    const {
      page = 1,
      limit = 10,
      search,
      teacherId,
      courseLevelId,
      status,
      tenantId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    // Teacher Isolation: Teachers can only see their own groups
    if (currentUser.role === UserRole.TEACHER) {
      where.OR = [
        { teacherId: currentUser.sub },
        { supportTeacherId: currentUser.sub },
      ];
    } else if (teacherId) {
      where.teacherId = teacherId;
    }

    if (courseLevelId) where.courseLevelId = courseLevelId;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip,
        take: limit,
        include: {
          courseLevel: {
            select: { name: true, course: { select: { name: true } } },
          },
          teacher: { select: { firstName: true, lastName: true, phone: true } },
          room: { select: { name: true } },
          branch: { select: { name: true } },
          _count: {
            select: { enrollments: true, lessons: true }, // Dashboard stats
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.group.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        courseLevel: { include: { course: true } },
        teacher: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        supportTeacher: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        branch: true,
        room: true,
        _count: { select: { enrollments: true, lessons: true } },
      },
    });

    if (!group) throw new NotFoundException(`Group with ID ${id} not found`);

    // Tenant Authorization Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'This group does not belong to your organization',
      );
    }

    // Teacher Authorization Check (Optional: restrict teachers to only view full details of their own groups)
    if (
      currentUser.role === UserRole.TEACHER &&
      group.teacherId !== currentUser.sub &&
      group.supportTeacherId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You do not have access to view the details of this group',
      );
    }

    return group;
  }

  async update(id: number, dto: UpdateGroupDto, currentUser: JwtPayload) {
    const group = await this.findOne(id, currentUser); // Ruxsatni tekshiramiz

    // 1. Tenant ID ni o'zgartirishni qat'iyan taqiqlaymiz
    if (dto.tenantId && dto.tenantId !== group.tenantId) {
      throw new BadRequestException(
        'Cannot change the organization (tenant) of an existing group',
      );
    }

    // 2. Agar o'qituvchi o'zgarayotgan bo'lsa, u shu tenantga tegishli ekanligini tekshiramiz
    if (dto.teacherId && dto.teacherId !== group.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (
        !teacher ||
        teacher.role !== UserRole.TEACHER ||
        teacher.tenantId !== group.tenantId
      ) {
        throw new ForbiddenException(
          'The new teacher is invalid or belongs to another organization',
        );
      }
    }

    // 3. Agar xona o'zgarayotgan bo'lsa, tekshiramiz
    if (dto.roomId && dto.roomId !== group.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomId },
        include: { branch: true },
      });
      if (!room || room.branch.tenantId !== group.tenantId) {
        throw new ForbiddenException(
          'The new room belongs to another organization',
        );
      }
    }

    // O'zgartirishni saqlash
    return this.prisma.group.update({
      where: { id },
      data: {
        ...dto,
        tenantId: group.tenantId, // DTO dan kelgan tenantId ni inobatga olmaslik uchun o'zimiznikini majburlaymiz
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const group = await this.findOne(id, currentUser);

    // Relational Check: Prevent deletion if students are enrolled or lessons exist
    if (group._count.enrollments > 0 || group._count.lessons > 0) {
      throw new BadRequestException(
        `Cannot delete this group because it has ${group._count.enrollments} enrolled students and ${group._count.lessons} lessons. Please archive it instead.`,
      );
    }

    return this.prisma.group.delete({
      where: { id },
    });
  }

  private teacherWhere(user: JwtPayload) {
    // Teacher o'zining main yoki support guruhlarini ko'rsin
    return {
      OR: [{ teacherId: user.sub }, { supportTeacherId: user.sub }],
    };
  }

  async findAll1(query: any, user: JwtPayload) {
    const where: any = {};

    // Tenant scope (platform admin bo'lmasa)
    if (user.role !== UserRole.PLATFORM_ADMIN) where.tenantId = user.tenantId;

    // Teacher scope
    if (user.role === UserRole.TEACHER)
      Object.assign(where, this.teacherWhere(user));

    // Query filters (swagger'da bor)
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    if (query.teacherId && user.role !== UserRole.TEACHER)
      where.teacherId = Number(query.teacherId);
    if (query.courseLevelId) where.courseLevelId = Number(query.courseLevelId);
    if (query.status) where.status = query.status;

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.group.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findStudentsByGroup(groupId: number, user: JwtPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');

    // Tenant check
    if (
      user.role !== UserRole.PLATFORM_ADMIN &&
      group.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Teacher check (faqat o'z guruhida)
    if (user.role === UserRole.TEACHER) {
      const ok =
        group.teacherId === user.sub || group.supportTeacherId === user.sub;
      if (!ok) throw new ForbiddenException('This group is not yours');
    }

    // Studentlar enrollment orqali
    const enrollments = await this.prisma.enrollment.findMany({
      where: { groupId, status: 'active' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return enrollments.map((e) => e.student);
  }
}
