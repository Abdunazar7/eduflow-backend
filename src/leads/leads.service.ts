import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FindAllLeadsDto } from './dto/find-all-leads.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadDto, currentUser: JwtPayload) {
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    if (!targetTenantId) throw new BadRequestException('Tenant ID is required');

    // Verify Status Authorization
    if (dto.statusId) {
      const status = await this.prisma.leadStatus.findUnique({
        where: { id: dto.statusId },
      });
      if (!status) throw new NotFoundException('Lead Status not found');
      // Status must be either Global (null) or belong to this specific tenant
      if (status.tenantId !== null && status.tenantId !== targetTenantId) {
        throw new ForbiddenException(
          'The selected status belongs to another organization',
        );
      }
    }

    // Verify Assigned User Authorization
    if (dto.assignedTo) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedTo },
      });
      if (!assignee) throw new NotFoundException('Assigned User not found');
      if (assignee.tenantId !== targetTenantId) {
        throw new ForbiddenException(
          'Cannot assign a lead to a user outside your organization',
        );
      }
    }

    return this.prisma.lead.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
      },
    });
  }

  async findAll(query: FindAllLeadsDto, currentUser: JwtPayload) {
    const {
      page = 1,
      limit = 20,
      search,
      statusId,
      assignedTo,
      source,
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

    if (statusId) where.statusId = statusId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (source) where.source = { equals: source, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          status: { select: { id: true, name: true } },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        status: true,
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    if (!lead) throw new NotFoundException(`Lead with ID ${id} not found`);

    // Tenant Security Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      lead.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('You do not have access to this lead');
    }

    return lead;
  }

  async update(id: number, dto: UpdateLeadDto, currentUser: JwtPayload) {
    const lead = await this.findOne(id, currentUser); // Initial View Check

    // Re-verify Status if it's being updated
    if (dto.statusId && dto.statusId !== lead.statusId) {
      const status = await this.prisma.leadStatus.findUnique({
        where: { id: dto.statusId },
      });
      if (!status) throw new NotFoundException('Lead Status not found');
      if (status.tenantId !== null && status.tenantId !== lead.tenantId) {
        throw new ForbiddenException(
          'The selected status belongs to another organization',
        );
      }
    }

    // Re-verify Assigned User if it's being updated
    if (dto.assignedTo && dto.assignedTo !== lead.assignedTo) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedTo },
      });
      if (!assignee) throw new NotFoundException('Assigned User not found');
      if (assignee.tenantId !== lead.tenantId) {
        throw new ForbiddenException(
          'Cannot assign lead to a user outside your organization',
        );
      }
    }

    return this.prisma.lead.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const lead = await this.findOne(id, currentUser); // Security check

    return this.prisma.lead.delete({
      where: { id: lead.id },
    });
  }
}
