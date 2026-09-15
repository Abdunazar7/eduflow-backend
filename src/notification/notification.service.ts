import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { AuthUser } from '../commons/types';

// Scheduled jobs run on the centres' local clock, not the server's (a VPS is
// usually UTC, which would send the 09:00 reminder at 14:00 in Tashkent).
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'Asia/Tashkent';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================================
  // 1. API — always scoped to the signed-in user
  // ==========================================================

  /** Internal, for triggers in other modules. No permission checks. */
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
  }

  /** From the API: the sender must be allowed to reach the recipient. */
  async createFor(dto: CreateNotificationDto, sender: AuthUser) {
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { tenantId: true, role: true },
    });

    if (!recipient) throw new NotFoundException('Recipient not found');

    if (
      sender.role !== UserRole.PLATFORM_ADMIN &&
      recipient.tenantId !== sender.tenantId
    ) {
      throw new ForbiddenException(
        'You can only notify users in your own organisation',
      );
    }

    if (sender.role === UserRole.TEACHER && recipient.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Teachers can only notify students');
    }

    return this.create(dto);
  }

  async findForUser(userId: number, query: FindNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.isRead === undefined ? {} : { isRead: query.isRead }),
    };

    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data,
      meta: {
        total,
        unread,
        page,
        lastPage: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async unreadCount(userId: number) {
    const unread = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unread };
  }

  // Each write below filters on both id and userId, so guessing another
  // user's notification id finds nothing rather than changing it.

  async markAsRead(id: number, userId: number) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (!count) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async remove(id: number, userId: number) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    if (!count) throw new NotFoundException('Notification not found');
    return { success: true };
  }

  async clearAll(userId: number) {
    return this.prisma.notification.deleteMany({ where: { userId } });
  }

  // ==========================================================
  // 2. TRIGGERS — called by other modules
  // ==========================================================

  /** STUDENT: payment confirmed, added to a group, etc. */
  async notifyStudent(
    studentId: number,
    title: string,
    message: string,
    type: 'success' | 'info' = 'info',
  ) {
    return this.create({ userId: studentId, title, message, type });
  }

  /** TEACHER: assigned as the main teacher of a group. */
  async notifyTeacher(teacherId: number, groupName: string) {
    return this.create({
      userId: teacherId,
      title: 'Yangi guruh biriktirildi',
      message: `Siz "${groupName}" guruhiga asosiy o'qituvchi etib tayinlandingiz.`,
      type: 'success',
    });
  }

  /** ADMIN and MANAGER of the tenant: a new lead came in. */
  async notifyStaffNewLead(tenantId: number, leadName: string) {
    const staff = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: [UserRole.ADMIN, UserRole.MANAGER] },
      },
      select: { id: true },
    });

    if (!staff.length) return;

    await this.prisma.notification.createMany({
      data: staff.map(({ id }) => ({
        userId: id,
        title: 'Yangi Lid keldi',
        message: `Tizimga yangi mijoz qo'shildi: ${leadName}. Bog'lanish kutilmoqda.`,
        type: 'warning',
      })),
    });
  }

  /** PLATFORM_ADMIN: a new tenant joined the platform. */
  async notifyPlatformAdminNewTenant(tenantName: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.PLATFORM_ADMIN, isActive: true },
      select: { id: true },
    });

    if (!admins.length) return;

    await this.prisma.notification.createMany({
      data: admins.map(({ id }) => ({
        userId: id,
        title: "Yangi Tenant Ro'yxatdan o'tdi",
        message: `Platformada yangi o'quv markazi ochildi: ${tenantName}`,
        type: 'info',
      })),
    });
  }

  // ==========================================================
  // 3. SCHEDULED JOBS (need ScheduleModule.forRoot() in AppModule)
  // ==========================================================

  /** Every morning at 09:00 local time, remind students who owe money. */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'student-debt-reminders',
    timeZone: APP_TIMEZONE,
  })
  async checkStudentBalances() {
    const debtors = await this.prisma.studentProfile.findMany({
      where: { balance: { lt: 0 }, user: { isActive: true } },
      select: {
        userId: true,
        balance: true,
        user: { select: { firstName: true } },
      },
    });

    if (!debtors.length) return;

    await this.prisma.notification.createMany({
      data: debtors.map((debtor) => ({
        userId: debtor.userId,
        title: 'Qarzdorlik haqida ogohlantirish',
        message: `Hurmatli ${debtor.user.firstName}, hisobingizda ${formatSom(debtor.balance)} so'm qarzdorlik mavjud. Iltimos, to'lovni amalga oshiring.`,
        type: 'error',
      })),
    });

    this.logger.log(`Debt reminders sent to ${debtors.length} students`);
  }
}

/** -500000 → "500 000". The message already says it is a debt. */
function formatSom(balance: Prisma.Decimal): string {
  return Math.abs(Number(balance)).toLocaleString('en-US').replace(/,/g, ' ');
}
