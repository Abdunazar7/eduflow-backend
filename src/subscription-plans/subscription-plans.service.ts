import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: dto,
    });
  }

  async findAll() {
    // Returns all plans ordered by price, and includes a count of how many
    // tenants are currently using each plan (great for the Platform Admin dashboard)
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { monthlyPrice: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription Plan with ID ${id} not found`);
    }

    return plan;
  }

  async update(id: number, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription Plan with ID ${id} not found`);
    }

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription Plan with ID ${id} not found`);
    }

    // Safety Check: Prevent deletion if tenants are actively using this plan.
    // Deleting it would break their billing and the relational database integrity.
    const activeSubscriptions = await this.prisma.tenantSubscription.count({
      where: { planId: id },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Cannot delete this plan because ${activeSubscriptions} tenant(s) are currently subscribed to it. Please migrate them to another plan first.`,
      );
    }

    return this.prisma.subscriptionPlan.delete({
      where: { id },
    });
  }
}
