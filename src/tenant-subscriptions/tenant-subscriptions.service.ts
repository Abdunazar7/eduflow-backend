import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTenantSubscriptionDto,
  SubscriptionStatus,
} from './dto/create-tenant-subscription.dto';
import { UpdateTenantSubscriptionDto } from './dto/update-tenant-subscription.dto';
import { FindAllTenantSubscriptionsDto } from './dto/find-all-tenant-subscriptions.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class TenantSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantSubscriptionDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Subscription Plan not found');

    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('End date must be after the start date');
    }

    return this.prisma.$transaction(async (tx) => {
      // Auto-cancel previous active subscriptions for this tenant to prevent overlaps
      if (dto.status === SubscriptionStatus.ACTIVE) {
        await tx.tenantSubscription.updateMany({
          where: {
            tenantId: dto.tenantId,
            status: SubscriptionStatus.ACTIVE,
          },
          data: { status: SubscriptionStatus.CANCELLED },
        });
      }

      return tx.tenantSubscription.create({
        data: {
          ...dto,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      });
    });
  }

  async findAll(query: FindAllTenantSubscriptionsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, tenantId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tenantSubscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          tenant: { select: { name: true, subdomain: true, isActive: true } },
          plan: {
            select: { name: true, monthlyPrice: true, maxStudents: true },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.tenantSubscription.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    // Security check: Only Platform Admin or the Tenant's own staff can view this
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      subscription.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this subscription',
      );
    }

    return subscription;
  }

  async update(id: number, dto: UpdateTenantSubscriptionDto) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id },
    });
    if (!subscription)
      throw new NotFoundException(`Subscription with ID ${id} not found`);

    if (
      dto.startDate &&
      dto.endDate &&
      new Date(dto.startDate) >= new Date(dto.endDate)
    ) {
      throw new BadRequestException('End date must be after the start date');
    }

    return this.prisma.tenantSubscription.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: number) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id },
    });
    if (!subscription)
      throw new NotFoundException(`Subscription with ID ${id} not found`);

    // In a real financial system, hard-deleting billing records is bad practice.
    // Instead of deleting, we force it into a 'cancelled' status.
    return this.prisma.tenantSubscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }
}
