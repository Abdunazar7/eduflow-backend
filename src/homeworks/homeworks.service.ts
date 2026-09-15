import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { FindAllHomeworksDto } from './dto/find-all-homeworks.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class HomeworksService {
  constructor(private readonly prisma: PrismaService) {}

  // Centralized security check for mutations (Create/Update/Delete)
  private async validateLessonManagementAccess(
    lessonId: number,
    currentUser: JwtPayload,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { group: true },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    // Tenant Isolation
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      lesson.group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Teacher Isolation
    if (
      currentUser.role === UserRole.TEACHER &&
      lesson.group.teacherId !== currentUser.sub &&
      lesson.group.supportTeacherId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You can only manage homework for your own classes',
      );
    }

    return lesson;
  }

  async create(dto: CreateHomeworkDto, currentUser: JwtPayload) {
    await this.validateLessonManagementAccess(dto.lessonId, currentUser);

    return this.prisma.homework.create({
      data: dto,
    });
  }

  async findAll(query: FindAllHomeworksDto, currentUser: JwtPayload) {
    const { page = 1, limit = 20, lessonId, groupId, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { lesson: { group: {} } };

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.lesson.group.tenantId = currentUser.tenantId;
    }

    // Contextual Visibility
    if (currentUser.role === UserRole.STUDENT) {
      where.lesson.group.enrollments = {
        some: { studentId: currentUser.sub, status: 'active' },
      };
    } else if (currentUser.role === UserRole.TEACHER) {
      where.lesson.group.OR = [
        { teacherId: currentUser.sub },
        { supportTeacherId: currentUser.sub },
      ];
    }

    // Explicit Filters
    if (lessonId) where.lessonId = lessonId;
    if (groupId) where.lesson.groupId = groupId;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.homework.findMany({
        where,
        skip,
        take: limit,
        include: {
          lesson: {
            select: {
              id: true,
              topic: true,
              date: true,
              group: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: { submissions: true }, // Tells the teacher how many students submitted work
          },
        },
        orderBy: { lesson: { date: 'desc' } },
      }),
      this.prisma.homework.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            group: {
              include: {
                enrollments: { select: { studentId: true, status: true } },
              },
            },
          },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!homework)
      throw new NotFoundException(`Homework with ID ${id} not found`);

    // Tenant Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      homework.lesson.group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Student View Check
    if (currentUser.role === UserRole.STUDENT) {
      const isEnrolled = homework.lesson.group.enrollments.some(
        (e) => e.studentId === currentUser.sub && e.status === 'active',
      );
      if (!isEnrolled)
        throw new ForbiddenException(
          'You can only view homework for your active classes',
        );
    }

    // Teacher View Check
    if (currentUser.role === UserRole.TEACHER) {
      if (
        homework.lesson.group.teacherId !== currentUser.sub &&
        homework.lesson.group.supportTeacherId !== currentUser.sub
      ) {
        throw new ForbiddenException(
          'You can only view homework for your own classes',
        );
      }
    }

    // Clean up sensitive/heavy relations before returning
    delete (homework.lesson.group as any).enrollments;

    return homework;
  }

  async update(id: number, dto: UpdateHomeworkDto, currentUser: JwtPayload) {
    const homework = await this.findOne(id, currentUser); // Initial view security check
    await this.validateLessonManagementAccess(homework.lessonId, currentUser); // Write security check

    return this.prisma.homework.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const homework = await this.findOne(id, currentUser); // View check
    await this.validateLessonManagementAccess(homework.lessonId, currentUser); // Write check

    // Relational Integrity: Cannot delete homework if students have already submitted work!
    if (homework._count.submissions > 0) {
      throw new BadRequestException(
        `Cannot delete this homework because ${homework._count.submissions} student(s) have already submitted their work. Please delete the submissions first.`,
      );
    }

    return this.prisma.homework.delete({
      where: { id },
    });
  }
}
