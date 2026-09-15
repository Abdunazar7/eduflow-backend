import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  private async assertTeacherOwnsGroup(groupId: number, user: JwtPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');

    if (
      user.role !== UserRole.PLATFORM_ADMIN &&
      group.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === UserRole.TEACHER) {
      const ok =
        group.teacherId === user.sub || group.supportTeacherId === user.sub;
      if (!ok) throw new ForbiddenException('This group is not yours');
    }

    return group;
  }

  async findAll(query: any, user: JwtPayload) {
    const where: any = {};

    if (user.role !== UserRole.PLATFORM_ADMIN)
      where.group = { tenantId: user.tenantId };

    // teacher faqat o'z guruhlari lessonlarini ko'rsin
    if (user.role === UserRole.TEACHER) {
      where.group = {
        ...(where.group ?? {}),
        OR: [{ teacherId: user.sub }, { supportTeacherId: user.sub }],
      };
    }

    if (query.groupId) where.groupId = Number(query.groupId);
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          group: { select: { id: true, name: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async create(
    dto: { groupId: number; date: string; topic?: string; status?: string },
    user: JwtPayload,
  ) {
    await this.assertTeacherOwnsGroup(dto.groupId, user);

    return this.prisma.lesson.create({
      data: {
        groupId: dto.groupId,
        date: new Date(dto.date),
        topic: dto.topic,
        status: dto.status ?? 'planned',
        teacherId: user.role === UserRole.TEACHER ? user.sub : undefined,
      },
    });
  }

  async update(id: number, dto: any, user: JwtPayload) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // agar groupId o'zgarsa ham tekshiramiz
    const targetGroupId = dto.groupId ? Number(dto.groupId) : lesson.groupId;
    await this.assertTeacherOwnsGroup(targetGroupId, user);

    return this.prisma.lesson.update({
      where: { id },
      data: {
        groupId: dto.groupId ? Number(dto.groupId) : undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        topic: dto.topic ?? undefined,
        status: dto.status ?? undefined,
      },
    });
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            tenantId: true,
            teacherId: true,
            supportTeacherId: true,
            enrollments: { select: { studentId: true, status: true } }, // needed for student check
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        attendance: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        homeworks: true,
      },
    });

    if (!lesson) throw new NotFoundException(`Lesson with ID ${id} not found`);

    // Basic Tenant Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      lesson.group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Contextual Checks
    if (currentUser.role === UserRole.STUDENT) {
      const isEnrolled = lesson.group.enrollments.some(
        (e) => e.studentId === currentUser.sub && e.status === 'active',
      );
      if (!isEnrolled)
        throw new ForbiddenException('You are not enrolled in this group');
    }

    if (currentUser.role === UserRole.TEACHER) {
      if (
        lesson.group.teacherId !== currentUser.sub &&
        lesson.group.supportTeacherId !== currentUser.sub
      ) {
        throw new ForbiddenException(
          'You are not assigned to teach this group',
        );
      }
    }

    // Cleanup heavy relations before returning
    delete (lesson.group as any).enrollments;

    return lesson;
  }

  async remove(id: number, user: JwtPayload) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.assertTeacherOwnsGroup(lesson.groupId, user);

    const attendanceCount = await this.prisma.attendance.count({
      where: { lessonId: id },
    });
    if (attendanceCount > 0) {
      // swagger: delete fails if attendance exists :contentReference[oaicite:4]{index=4}
      throw new ForbiddenException('Cannot delete: attendance records exist');
    }

    await this.prisma.lesson.delete({ where: { id } });
    return { success: true };
  }
}
