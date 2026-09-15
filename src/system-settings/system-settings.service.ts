import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemSettingDto } from './dto/create-system-setting.dto';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSystemSettingDto, currentUser: JwtPayload) {
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
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existing = await this.prisma.systemSetting.findUnique({
      where: { tenantId: targetTenantId },
    });

    if (existing) {
      throw new ConflictException(
        'Settings already exist for this organization. Use the update endpoint instead.',
      );
    }

    return this.prisma.systemSetting.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
      },
    });
  }

  async findAll(currentUser: JwtPayload) {
    // Only Platform Admins should ever need to query a list of all API keys system-wide.
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'Only Platform Admins can view the global settings directory',
      );
    }

    return this.prisma.systemSetting.findMany({
      include: {
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
    });
  }

  async findOne(tenantId: number, currentUser: JwtPayload) {
    // Security check: Managers can only view their own settings
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'You do not have access to view these settings',
      );
    }

    const settings = await this.prisma.systemSetting.findUnique({
      where: { tenantId },
      include: {
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
    });

    if (!settings) {
      throw new NotFoundException(
        `Settings for Tenant ID ${tenantId} not found`,
      );
    }

    return settings;
  }

  async getMySettings(currentUser: JwtPayload) {
    // A convenient method for a Manager to get their own settings without passing IDs
    if (!currentUser.tenantId)
      throw new BadRequestException('User does not belong to a tenant');
    return this.findOne(currentUser.tenantId, currentUser);
  }

  async update(
    tenantId: number,
    dto: UpdateSystemSettingDto,
    currentUser: JwtPayload,
  ) {
    // Reuses the findOne security check
    const settings = await this.findOne(tenantId, currentUser);

    return this.prisma.systemSetting.update({
      where: { tenantId: settings.tenantId },
      data: dto,
    });
  }

  async remove(tenantId: number, currentUser: JwtPayload) {
    // Reuses the findOne security check
    const settings = await this.findOne(tenantId, currentUser);

    // Hard-deleting settings could break integrations. Ensure only the highest authority can do this.
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'Only Platform Admins can delete settings entirely. Please update fields to empty strings instead.',
      );
    }

    return this.prisma.systemSetting.delete({
      where: { tenantId: settings.tenantId },
    });
  }
}
