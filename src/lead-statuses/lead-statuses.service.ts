import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { FindAllLeadStatusesDto } from './dto/find-all-lead-statuses.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class LeadStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadStatusDto, currentUser: JwtPayload) {
    // If Admin/Manager, force the status to belong to their tenant.
    // If Platform Admin, use the provided tenantId (or null to make it a Global Status).
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId || null
        : currentUser.tenantId;

    if (targetTenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: targetTenantId },
      });
      if (!tenant) throw new NotFoundException('Tenant not found');
    }

    return this.prisma.leadStatus.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
      },
    });
  }

  async findAll(query: FindAllLeadStatusesDto, currentUser: JwtPayload) {
    const { tenantId } = query;

    // Determine which tenant's statuses to fetch
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? tenantId
        : currentUser.tenantId;

    return this.prisma.leadStatus.findMany({
      where: {
        OR: [
          { tenantId: null }, // Always include global statuses
          ...(targetTenantId ? [{ tenantId: targetTenantId }] : []),
        ],
      },
      orderBy: { orderIndex: 'asc' }, // Ensure Kanban columns are ordered correctly
      include: {
        _count: { select: { leads: true } }, // Show how many leads are in each column
      },
    });
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const status = await this.prisma.leadStatus.findUnique({
      where: { id },
      include: { _count: { select: { leads: true } } },
    });

    if (!status) throw new NotFoundException(`Lead Status ID ${id} not found`);

    // Visibility Check: Allow if it's a global status (null) OR belongs to the user's tenant
    if (
      status.tenantId !== null &&
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      status.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('You do not have access to this status');
    }

    return status;
  }

  async update(id: number, dto: UpdateLeadStatusDto, currentUser: JwtPayload) {
    const status = await this.findOne(id, currentUser); // Reuses view security check

    // Prevent modifying a global status unless you are a Platform Admin
    if (
      status.tenantId === null &&
      currentUser.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException('You cannot modify a global system status');
    }

    // Prevent transferring ownership to another tenant maliciously
    if (
      dto.tenantId !== undefined &&
      currentUser.role !== UserRole.PLATFORM_ADMIN
    ) {
      delete dto.tenantId;
    }

    return this.prisma.leadStatus.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const status = await this.findOne(id, currentUser); // Reuses view security check

    // Prevent deleting global statuses
    if (
      status.tenantId === null &&
      currentUser.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException('You cannot delete a global system status');
    }

    // Database Integrity Check
    if (status._count.leads > 0) {
      throw new ConflictException(
        `Cannot delete status "${status.name}" because it contains ${status._count.leads} leads. Please move them to another status first.`,
      );
    }

    return this.prisma.leadStatus.delete({
      where: { id },
    });
  }
}
