import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSmsLogDto } from './dto/create-sms-log.dto';
import { UpdateSmsLogDto } from './dto/update-sms-log.dto';
import { FindAllSmsLogsDto } from './dto/find-all-sms-logs.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class SmsLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSmsLogDto, currentUser: JwtPayload) {
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    // Platform Admins can log global SMS (tenantId = null), but schools must log to their tenant
    if (!targetTenantId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new BadRequestException('Tenant ID is required');
    }

    if (targetTenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: targetTenantId },
      });
      if (!tenant) throw new NotFoundException('Tenant not found');
    }

    return this.prisma.smsLog.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
      },
    });
  }

  async findAll(query: FindAllSmsLogsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 50, phone, status, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (tenantId !== undefined) {
      where.tenantId = tenantId;
    }

    if (phone) where.phone = { contains: phone };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.smsLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          tenant: { select: { name: true, subdomain: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.smsLog.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const log = await this.prisma.smsLog.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!log) throw new NotFoundException(`SMS Log with ID ${id} not found`);

    if (
      log.tenantId !== null &&
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      log.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this log',
      );
    }

    return log;
  }

  async update(id: number, dto: UpdateSmsLogDto, currentUser: JwtPayload) {
    const log = await this.findOne(id, currentUser); // Reuses security check

    // DTO inherently blocks updating phone/message. Only status can be patched.
    return this.prisma.smsLog.update({
      where: { id: log.id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const log = await this.findOne(id, currentUser);

    // SECURITY: SMS Logs are billing/auditing records. Only Platform Admins can delete them.
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'School Managers cannot delete system SMS logs.',
      );
    }

    return this.prisma.smsLog.delete({
      where: { id: log.id },
    });
  }
}
