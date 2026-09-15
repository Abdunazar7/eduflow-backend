import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherSettlementDto } from './dto/create-teacher-settlement.dto';
import { UpdateTeacherSettlementDto } from './dto/update-teacher-settlement.dto';
import { FindAllTeacherSettlementsDto } from './dto/find-all-teacher-settlements.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class TeacherSettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeacherSettlementDto, currentUser: JwtPayload) {
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    if (!targetTenantId) throw new BadRequestException('Tenant ID is required');

    // Validate Teacher
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      include: { teacherProfile: true },
    });

    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('Valid Teacher not found');
    }

    if (teacher.tenantId !== targetTenantId) {
      throw new ForbiddenException(
        'Cannot process settlements for a teacher outside your organization',
      );
    }

    // Prevent duplicate settlements for the exact same month for the same teacher
    const monthDate = new Date(dto.month);
    const existing = await this.prisma.teacherSettlement.findFirst({
      where: {
        teacherId: dto.teacherId,
        month: monthDate,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A settlement record already exists for this teacher in this specific month.',
      );
    }

    return this.prisma.teacherSettlement.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
        month: monthDate,
      },
    });
  }

  async findAll(query: FindAllTeacherSettlementsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 20, teacherId, status, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // 1. Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    // 2. Role Visibility Checks
    if (currentUser.role === UserRole.TEACHER) {
      where.teacherId = currentUser.sub; // Teachers ONLY see their own paychecks
    } else if (teacherId) {
      where.teacherId = teacherId;
    }

    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.teacherSettlement.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { month: 'desc' },
      }),
      this.prisma.teacherSettlement.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const settlement = await this.prisma.teacherSettlement.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        tenant: { select: { id: true, name: true } },
      },
    });

    if (!settlement)
      throw new NotFoundException(`Settlement with ID ${id} not found`);

    // Tenant check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      settlement.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Teacher check
    if (
      currentUser.role === UserRole.TEACHER &&
      settlement.teacherId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You can only view your own settlement details',
      );
    }

    return settlement;
  }

  async update(
    id: number,
    dto: UpdateTeacherSettlementDto,
    currentUser: JwtPayload,
  ) {
    const settlement = await this.findOne(id, currentUser); // Initial security checks

    return this.prisma.teacherSettlement.update({
      where: { id: settlement.id },
      data: {
        ...dto,
        month: dto.month ? new Date(dto.month) : undefined,
      },
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const settlement = await this.findOne(id, currentUser); // Security check

    // Optionally: Prevent deletion of PAID settlements to maintain financial records
    if (settlement.status === 'paid') {
      throw new BadRequestException(
        'Cannot delete a settlement that has already been marked as PAID. Please change its status first if this was a mistake.',
      );
    }

    return this.prisma.teacherSettlement.delete({
      where: { id: settlement.id },
    });
  }

  async findAll1(query: any, user: JwtPayload) {
    const where: any = {};

    // Tenant scope
    if (user.role !== UserRole.PLATFORM_ADMIN) where.tenantId = user.tenantId;

    // Teacher scope: faqat o'zi
    if (user.role === UserRole.TEACHER) {
      where.teacherId = user.sub;
    } else if (query.teacherId) {
      where.teacherId = Number(query.teacherId);
    }

    if (query.status) where.status = query.status;

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.teacherSettlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ month: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.teacherSettlement.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne1(id: number, user: JwtPayload) {
    const s = await this.prisma.teacherSettlement.findUnique({ where: { id } });
    if (!s) return null;

    if (user.role !== UserRole.PLATFORM_ADMIN && s.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === UserRole.TEACHER && s.teacherId !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
    return s;
  }
}
