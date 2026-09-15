import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FindAllAttendanceDto } from './dto/find-all-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper method to validate teacher authorization
  private async validateLessonAccess(
    lessonId: number,
    currentUser: JwtPayload,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { group: true },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      lesson.group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied to this organization');
    }

    if (
      currentUser.role === UserRole.TEACHER &&
      lesson.group.teacherId !== currentUser.sub &&
      lesson.group.supportTeacherId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You can only manage attendance for your own lessons',
      );
    }

    return lesson;
  }

  async create(dto: CreateAttendanceDto, currentUser: JwtPayload) {
    await this.validateLessonAccess(dto.lessonId, currentUser);

    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new BadRequestException('Valid student not found');
    }

    const existing = await this.prisma.attendance.findUnique({
      where: {
        lessonId_studentId: {
          lessonId: dto.lessonId,
          studentId: dto.studentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Attendance record already exists for this student in this lesson',
      );
    }

    return this.prisma.attendance.create({ data: dto });
  }


  async findAll(query: FindAllAttendanceDto, currentUser: JwtPayload) {
    const { page = 1, limit = 50, lessonId, studentId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Base Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.lesson = { group: { tenantId: currentUser.tenantId } };
    }

    // Role-based visibility
    if (currentUser.role === UserRole.STUDENT) {
      where.studentId = currentUser.sub; // Students only see their own attendance
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (currentUser.role === UserRole.TEACHER) {
      // Teachers only see attendance for groups they teach
      where.lesson = {
        ...where.lesson,
        group: {
          OR: [
            { teacherId: currentUser.sub },
            { supportTeacherId: currentUser.sub },
          ],
        },
      };
    }

    if (lessonId) where.lessonId = lessonId;

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          lesson: {
            select: {
              id: true,
              date: true,
              topic: true,
              group: { select: { name: true } },
            },
          },
        },
        orderBy: { lesson: { date: 'desc' } },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        lesson: { include: { group: true } },
      },
    });

    if (!attendance)
      throw new NotFoundException(`Attendance ID ${id} not found`);

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      attendance.lesson.group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (
      currentUser.role === UserRole.STUDENT &&
      attendance.studentId !== currentUser.sub
    ) {
      throw new ForbiddenException('You can only view your own attendance');
    }

    if (
      currentUser.role === UserRole.TEACHER &&
      attendance.lesson.group.teacherId !== currentUser.sub &&
      attendance.lesson.group.supportTeacherId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You can only view attendance for your own lessons',
      );
    }

    return attendance;
  }

  async update(id: number, dto: UpdateAttendanceDto, currentUser: JwtPayload) {
    const attendance = await this.findOne(id, currentUser); // Reuses security checks
    await this.validateLessonAccess(attendance.lessonId, currentUser);

    return this.prisma.attendance.update({ where: { id }, data: dto });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const attendance = await this.findOne(id, currentUser); // Security check
    await this.validateLessonAccess(attendance.lessonId, currentUser);

    return this.prisma.attendance.delete({ where: { id } });
  }

  private async assertTeacherOwnsLesson(lessonId: number, user: JwtPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { group: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    if (
      user.role !== UserRole.PLATFORM_ADMIN &&
      lesson.group.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === UserRole.TEACHER) {
      const ok =
        lesson.group.teacherId === user.sub ||
        lesson.group.supportTeacherId === user.sub;
      if (!ok) throw new ForbiddenException('This lesson is not yours');
    }

    return lesson;
  }

  async findAll1(query: any, user: JwtPayload) {
    const where: any = {};

    // Student bo'lsa faqat o'zi
    if (user.role === UserRole.STUDENT) where.studentId = user.sub;

    if (query.lessonId) where.lessonId = Number(query.lessonId);
    if (query.studentId && user.role !== UserRole.STUDENT)
      where.studentId = Number(query.studentId);

    // Teacher bo'lsa lessonId bo'yicha kelganda ownership tekshiramiz (frontend shunday qiladi)
    if (user.role === UserRole.TEACHER && query.lessonId) {
      await this.assertTeacherOwnsLesson(Number(query.lessonId), user);
    }

    const limit = Number(query.limit ?? 50);
    const page = Number(query.page ?? 1);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({ where, skip, take: limit }),
      this.prisma.attendance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async bulkUpsert(
    dto: {
      lessonId: number;
      records: Array<{ studentId: number; status: string; comment?: string }>;
    },
    user: JwtPayload,
  ) {
    await this.assertTeacherOwnsLesson(dto.lessonId, user);

    // Upsert (unique: lessonId+studentId)
    const ops = dto.records.map((r) =>
      this.prisma.attendance.upsert({
        where: {
          lessonId_studentId: {
            lessonId: dto.lessonId,
            studentId: r.studentId,
          },
        },
        create: {
          lessonId: dto.lessonId,
          studentId: r.studentId,
          status: r.status,
          comment: r.comment,
        },
        update: { status: r.status, comment: r.comment },
      }),
    );

    const result = await this.prisma.$transaction(ops);
    return { success: true, count: result.length };
  }
}
