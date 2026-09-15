import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '../attendance/enums/attendance.enum';
import { LessonStatus } from '../attendance/enums/lesson.enum';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/enums/transaction.enums';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type MonthBucket = { start: Date; end: Date; label: string };

/** The last `count` calendar months in UTC, oldest first, current month last. */
function lastMonths(count: number, now = new Date()): MonthBucket[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1),
    );
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    return { start, end, label: MONTH_NAMES[start.getUTCMonth()] };
  });
}

function inMonth(date: Date, month: MonthBucket) {
  return date >= month.start && date < month.end;
}

/** Percentage to one decimal place; 0 when there is nothing to divide by. */
function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

function normStatus(s: unknown) {
  return String(s ?? '').toLowerCase().trim();
}

function startOfMonthUTC(y: number, m0: number) {
  return new Date(Date.UTC(y, m0, 1));
}

function startOfNextMonthUTC(y: number, m0: number) {
  return new Date(Date.UTC(y, m0 + 1, 1));
}

function overlapsMonth(start: Date, end: Date, monthStart: Date, monthEnd: Date) {
  return start < monthEnd && end >= monthStart;
}

// Never return a whole user row from a report: it carries credentials.
const PUBLIC_USER = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  photoUrl: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tenant reports aggregate in the database. The previous version loaded
  // every transaction, lesson and attendance row of the tenant into memory
  // and filtered them in JavaScript, and ran five queries per teacher.

  /** MANAGER & ADMIN dashboard. */
  async getTenantAnalytics(tenantId: number) {
    const months = lastMonths(6);
    const since = months[0].start;
    const inTenantGroup = { group: { tenantId } };

    const [
      studentsCount,
      teachersCount,
      groupsCount,
      activeGroups,
      enrollmentsCount,
      revenue,
      completedLessons,
      attendanceTotal,
      attendancePresent,
      scores,
      recentIncome,
      recentEnrollments,
    ] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { tenantId, role: UserRole.TEACHER } }),
      this.prisma.group.count({ where: { tenantId } }),
      this.prisma.group.count({ where: { tenantId, status: 'active' } }),
      this.prisma.enrollment.count({ where: inTenantGroup }),
      this.prisma.transaction.aggregate({
        where: { tenantId, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.lesson.count({
        where: { ...inTenantGroup, status: LessonStatus.COMPLETED },
      }),
      this.prisma.attendance.count({ where: { lesson: inTenantGroup } }),
      this.prisma.attendance.count({
        where: { lesson: inTenantGroup, status: AttendanceStatus.PRESENT },
      }),
      this.prisma.homeworkSubmission.aggregate({
        where: { homework: { lesson: inTenantGroup } },
        _avg: { score: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          tenantId,
          type: TransactionType.INCOME,
          createdAt: { gte: since },
        },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.enrollment.findMany({
        where: { ...inTenantGroup, joinedAt: { gte: since } },
        select: { joinedAt: true },
      }),
    ]);

    // Previously every month was assigned the all-time enrollment total, so
    // the chart drew a flat line and labelled it growth.
    const monthlyTrends = months.map((month) => ({
      month: month.label,
      enrollments: recentEnrollments.filter((e) => inMonth(e.joinedAt, month))
        .length,
      revenue: recentIncome
        .filter((t) => inMonth(t.createdAt, month))
        .reduce((sum, t) => sum + Number(t.amount), 0),
    }));

    return {
      stats: {
        studentsCount,
        teachersCount,
        groupsCount,
        activeGroups,
        enrollmentsCount,
        totalRevenue: Number(revenue._sum.amount ?? 0),
        completedLessons,
        attendanceRate: percent(attendancePresent, attendanceTotal),
        // Ungraded submissions are excluded rather than counted as zero.
        avgSubmissionScore:
          Math.round(Number(scores._avg.score ?? 0) * 100) / 100,
      },
      charts: { monthlyTrends },
    };
  }

  async getRevenueAnalyticsByTenant(tenantId: number) {
    const [
      income,
      transactionCount,
      completedPayments,
      pendingPayments,
      recentTransactions,
      enrollments,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { tenantId, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where: { tenantId } }),
      this.prisma.transaction.count({
        where: {
          tenantId,
          type: TransactionType.INCOME,
          status: TransactionStatus.PAID,
        },
      }),
      this.prisma.transaction.count({
        where: {
          tenantId,
          OR: [{ status: null }, { status: { not: TransactionStatus.PAID } }],
        },
      }),
      this.prisma.transaction.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { group: { tenantId } },
        select: {
          contractPrice: true,
          status: true,
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      stats: {
        totalIncome: Number(income._sum.amount ?? 0),
        transactionCount,
        completedPayments,
        pendingPayments,
      },
      revenueByStudent: enrollments.map((e) => ({
        studentId: e.student.id,
        studentName: `${e.student.firstName} ${e.student.lastName}`,
        contractPrice: Number(e.contractPrice ?? 0),
        status: e.status,
      })),
      recentTransactions,
    };
  }

  async getStudentEnrollmentTrends(tenantId: number) {
    const months = lastMonths(6);
    const inTenantGroup = { group: { tenantId } };

    const [byStatus, trendRows, recentEnrollments] = await Promise.all([
      this.prisma.enrollment.groupBy({
        by: ['status'],
        where: inTenantGroup,
        _count: { _all: true },
      }),
      this.prisma.enrollment.findMany({
        where: { ...inTenantGroup, joinedAt: { gte: months[0].start } },
        select: { joinedAt: true },
      }),
      this.prisma.enrollment.findMany({
        where: inTenantGroup,
        orderBy: { joinedAt: 'desc' },
        take: 10,
        include: {
          // Was `student: true`, which sent the password hash to the browser.
          student: { select: PUBLIC_USER },
          group: { select: { name: true } },
        },
      }),
    ]);

    const countOf = (status: string) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    return {
      statusDistribution: {
        active: countOf('active'),
        frozen: countOf('frozen'),
        completed: countOf('completed'),
        dropped: countOf('dropped'),
      },
      enrollmentsTrend: months.map((month) => ({
        month: month.label,
        enrollments: trendRows.filter((e) => inMonth(e.joinedAt, month)).length,
      })),
      recentEnrollments,
    };
  }

  /** Five queries in total, however many teachers the tenant has. */
  async getTeacherPerformance(tenantId: number) {
    const [teachers, groupRows, lessonRows, studentRows, attendanceRows] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { tenantId, role: UserRole.TEACHER },
          select: { id: true, firstName: true, lastName: true },
        }),
        this.prisma.group.groupBy({
          by: ['teacherId'],
          where: { tenantId },
          _count: { _all: true },
        }),
        this.prisma.$queryRaw<
          { teacherId: number; total: number; completed: number }[]
        >`
          SELECT g."teacherId" AS "teacherId",
                 COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE l."status" = ${LessonStatus.COMPLETED})::int AS completed
          FROM "Lesson" l
          JOIN "Group" g ON g."id" = l."groupId"
          WHERE g."tenantId" = ${tenantId}
          GROUP BY g."teacherId"`,
        this.prisma.$queryRaw<{ teacherId: number; total: number }[]>`
          SELECT g."teacherId" AS "teacherId", COUNT(*)::int AS total
          FROM "Enrollment" e
          JOIN "Group" g ON g."id" = e."groupId"
          WHERE g."tenantId" = ${tenantId}
          GROUP BY g."teacherId"`,
        this.prisma.$queryRaw<
          { teacherId: number; total: number; present: number }[]
        >`
          SELECT g."teacherId" AS "teacherId",
                 COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE a."status" = ${AttendanceStatus.PRESENT})::int AS present
          FROM "Attendance" a
          JOIN "Lesson" l ON l."id" = a."lessonId"
          JOIN "Group" g ON g."id" = l."groupId"
          WHERE g."tenantId" = ${tenantId}
          GROUP BY g."teacherId"`,
      ]);

    const groups = new Map(groupRows.map((r) => [r.teacherId, r._count._all]));
    const lessons = new Map(lessonRows.map((r) => [r.teacherId, r]));
    const students = new Map(studentRows.map((r) => [r.teacherId, r.total]));
    const attendance = new Map(attendanceRows.map((r) => [r.teacherId, r]));

    return {
      teachers: teachers.map((teacher) => {
        const att = attendance.get(teacher.id);
        return {
          teacherId: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          groupsCount: groups.get(teacher.id) ?? 0,
          lessonsCount: lessons.get(teacher.id)?.total ?? 0,
          completedLessons: lessons.get(teacher.id)?.completed ?? 0,
          totalStudents: students.get(teacher.id) ?? 0,
          attendanceRate: percent(att?.present ?? 0, att?.total ?? 0),
        };
      }),
      totalTeachers: teachers.length,
    };
  }

  async getLeadsMetrics(tenantId: number) {
    const [byStatus, totalLeads, recentLeads, conversion] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['statusId'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { status: true },
      }),
      // A lead has converted when a student with the same phone number exists
      // in this tenant and is enrolled somewhere. The previous figure divided
      // all enrollments by all leads, which had no relationship to leads.
      this.prisma.$queryRaw<{ converted: number }[]>`
        SELECT COUNT(DISTINCT l."id")::int AS converted
        FROM "Lead" l
        JOIN "User" u
          ON u."tenantId" = l."tenantId"
         AND u."role" = 'STUDENT'
         AND u."phone" = regexp_replace(l."phone", '[^0-9]', '', 'g')
        WHERE l."tenantId" = ${tenantId}
          AND EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."studentId" = u."id")`,
    ]);

    const statusIds = byStatus
      .map((row) => row.statusId)
      .filter((id): id is number => id !== null);

    const statuses = await this.prisma.leadStatus.findMany({
      where: { id: { in: statusIds } },
      select: { id: true, name: true },
    });
    const statusName = new Map(statuses.map((s) => [s.id, s.name]));

    const statusBreakdown: Record<string, number> = {};
    for (const row of byStatus) {
      const name =
        (row.statusId !== null && statusName.get(row.statusId)) || 'Unknown';
      statusBreakdown[name] = (statusBreakdown[name] ?? 0) + row._count._all;
    }

    return {
      totalLeads,
      statusBreakdown,
      conversionRate: percent(conversion[0]?.converted ?? 0, totalLeads),
      recentLeads,
    };
  }

  // Platform-level reports read plans, tenants and subscriptions only. Those
  // tables stay small (one row per customer), so in-memory math is fine here.

  async superAdminOverview() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      select: { id: true, name: true, monthlyPrice: true, maxStudents: true },
    });

    const planById = new Map<number, { name: string; price: number }>();
    for (const p of plans) {
      planById.set(p.id, { name: p.name, price: Number(p.monthlyPrice) });
    }

    const tenants = await this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeTenants = tenants.filter((t) => t.isActive).length;

    const subs = await this.prisma.tenantSubscription.findMany({
      select: {
        id: true,
        tenantId: true,
        planId: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: 'desc' },
    });

    const isActiveSub = (s: { status: string }) => normStatus(s.status) === 'active';
    const activeSubs = subs.filter(isActiveSub);

    const totalRevenue = activeSubs.reduce(
      (sum, s) => sum + (planById.get(s.planId)?.price ?? 0),
      0,
    );

    const tenantsByPlan = plans.map((p) => ({
      name: p.name,
      count: activeSubs.filter((s) => s.planId === p.id).length,
    }));

    // Revenue per month: active subscriptions overlapping that month.
    const revenueTrend = lastMonths(6).map((month) => ({
      month: month.label,
      revenue: activeSubs.reduce((sum, s) => {
        const overlaps = overlapsMonth(s.startDate, s.endDate, month.start, month.end);
        return overlaps ? sum + (planById.get(s.planId)?.price ?? 0) : sum;
      }, 0),
    }));

    // Latest subscription per tenant, by start date.
    const latestSubByTenant = new Map<number, (typeof subs)[number]>();
    for (const s of subs) {
      const existing = latestSubByTenant.get(s.tenantId);
      if (!existing || s.startDate > existing.startDate) {
        latestSubByTenant.set(s.tenantId, s);
      }
    }

    const recentTenants = tenants.slice(0, 5).map((t) => {
      const sub = latestSubByTenant.get(t.id);
      const plan = sub ? planById.get(sub.planId) : null;
      return {
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        planName: plan?.name ?? null,
        subscriptionStatus: sub?.status ?? null,
      };
    });

    return {
      stats: {
        activeTenants,
        activeSubscriptions: activeSubs.length,
        totalRevenue,
        // Not computed yet; revenueAnalytics() has the real growth figure.
        monthlyGrowth: 0,
      },
      charts: { tenantsByPlan, revenueTrend },
      recentTenants,
    };
  }

  async revenueAnalytics() {
    const [plans, subs, tenants] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        select: { id: true, name: true, monthlyPrice: true },
      }),
      this.prisma.tenantSubscription.findMany({
        select: {
          id: true,
          tenantId: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      }),
      this.prisma.tenant.findMany({ select: { id: true, createdAt: true } }),
    ]);

    const planById = new Map<number, { name: string; price: number }>();
    for (const p of plans) {
      planById.set(p.id, { name: p.name, price: Number(p.monthlyPrice) });
    }

    const activeSubsNow = subs.filter((s) => normStatus(s.status) === 'active');
    const totalMRR = activeSubsNow.reduce(
      (sum, s) => sum + (planById.get(s.planId)?.price ?? 0),
      0,
    );
    const avgRevenuePerTenant = activeSubsNow.length
      ? totalMRR / activeSubsNow.length
      : 0;
    const arr = totalMRR * 12;

    const now = new Date();
    const year = now.getUTCFullYear();

    // MRR in a month: active subscriptions overlapping it.
    const mrrForRange = (monthStart: Date, monthEnd: Date) =>
      activeSubsNow.reduce((sum, s) => {
        if (!overlapsMonth(s.startDate, s.endDate, monthStart, monthEnd)) return sum;
        return sum + (planById.get(s.planId)?.price ?? 0);
      }, 0);

    const revenueByMonth = MONTH_NAMES.map((month, m0) => ({
      month,
      revenue: mrrForRange(startOfMonthUTC(year, m0), startOfNextMonthUTC(year, m0)),
    }));

    const newTenantsByMonth = MONTH_NAMES.map((month, m0) => {
      const start = startOfMonthUTC(year, m0);
      const end = startOfNextMonthUTC(year, m0);
      return {
        month,
        newTenants: tenants.filter((t) => t.createdAt >= start && t.createdAt < end)
          .length,
      };
    });

    const planDistribution = plans.map((p) => {
      const count = activeSubsNow.filter((s) => s.planId === p.id).length;
      return { name: p.name, value: count, revenue: count * Number(p.monthlyPrice) };
    });

    // Growth and churn compare the last full month with the month before it.
    const m0 = now.getUTCMonth();
    const lastMonthStart = startOfMonthUTC(year, m0 - 1);
    const lastMonthEnd = startOfMonthUTC(year, m0);
    const prevMonthStart = startOfMonthUTC(year, m0 - 2);
    const prevMonthEnd = lastMonthStart;

    const lastMonthMRR = mrrForRange(lastMonthStart, lastMonthEnd);
    const prevMonthMRR = mrrForRange(prevMonthStart, prevMonthEnd);

    const growth =
      prevMonthMRR <= 0
        ? lastMonthMRR > 0
          ? 100
          : 0
        : Number((((lastMonthMRR - prevMonthMRR) / prevMonthMRR) * 100).toFixed(1));

    const activeAtStartOfLastMonth = activeSubsNow.filter(
      (s) => s.startDate <= lastMonthStart && s.endDate >= lastMonthStart,
    ).length;

    // Without a cancelledAt column, "ended during last month" is the best
    // available churn signal.
    const churnedLastMonth = subs.filter(
      (s) => s.endDate >= lastMonthStart && s.endDate < lastMonthEnd,
    ).length;

    const churnRate =
      activeAtStartOfLastMonth <= 0
        ? 0
        : Number(((churnedLastMonth / activeAtStartOfLastMonth) * 100).toFixed(1));

    return {
      kpis: { totalMRR, avgRevenuePerTenant, arr, growth, churnRate },
      charts: { revenueByMonth, newTenantsByMonth, planDistribution },
      debug: {
        lastMonthMRR,
        prevMonthMRR,
        activeAtStartOfLastMonth,
        churnedLastMonth,
      },
    };
  }
}
