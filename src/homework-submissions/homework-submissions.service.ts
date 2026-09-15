import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkSubmissionDto } from './dto/create-homework-submission.dto';
import { UpdateHomeworkSubmissionDto } from './dto/update-homework-submission.dto';
import { FindAllHomeworkSubmissionsDto } from './dto/find-all-homework-submissions.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class HomeworkSubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHomeworkSubmissionDto, currentUser: JwtPayload) {
    // 1. Validate Student Identity
    if (
      currentUser.role === UserRole.STUDENT &&
      dto.studentId !== currentUser.sub
    ) {
      throw new ForbiddenException('You can only submit homework for yourself');
    }

    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homeworkId },
      include: {
        lesson: { include: { group: { include: { enrollments: true } } } },
      },
    });

    if (!homework) throw new NotFoundException('Homework not found');

    // 2. Tenant & Enrollment Checks
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      homework.lesson.group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot submit homework to a group outside your organization',
      );
    }

    if (currentUser.role === UserRole.STUDENT) {
      const isEnrolled = homework.lesson.group.enrollments.some(
        (e) => e.studentId === currentUser.sub && e.status === 'active',
      );
      if (!isEnrolled)
        throw new ForbiddenException('You are not enrolled in this group');
    }

    // 3. Prevent duplicate submissions (Upsert logic or block)
    const existing = await this.prisma.homeworkSubmission.findFirst({
      where: { homeworkId: dto.homeworkId, studentId: dto.studentId },
    });

    if (existing) {
      throw new ConflictException(
        'Homework has already been submitted. Use the update endpoint to resubmit.',
      );
    }

    return this.prisma.homeworkSubmission.create({
      data: dto,
    });
  }

  async findAll(query: FindAllHomeworkSubmissionsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 20, homeworkId, studentId, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = { homework: { lesson: { group: {} } } };

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.homework.lesson.group.tenantId = currentUser.tenantId;
    } else if (tenantId) {
      where.homework.lesson.group.tenantId = tenantId;
    }

    // Contextual Visibility
    if (currentUser.role === UserRole.STUDENT) {
      where.studentId = currentUser.sub;
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (currentUser.role === UserRole.TEACHER) {
      where.homework.lesson.group.OR = [
        { teacherId: currentUser.sub },
        { supportTeacherId: currentUser.sub },
      ];
    }

    if (homeworkId) where.homeworkId = homeworkId;

    const [data, total] = await Promise.all([
      this.prisma.homeworkSubmission.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          grader: { select: { id: true, firstName: true, lastName: true } },
          homework: { select: { id: true, title: true, maxScore: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.homeworkSubmission.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        grader: { select: { id: true, firstName: true, lastName: true } },
        homework: { include: { lesson: { include: { group: true } } } },
      },
    });

    if (!submission)
      throw new NotFoundException(`Submission with ID ${id} not found`);

    const tenantId = submission.homework.lesson.group.tenantId;

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (
      currentUser.role === UserRole.STUDENT &&
      submission.studentId !== currentUser.sub
    ) {
      throw new ForbiddenException('You can only view your own submission');
    }

    if (currentUser.role === UserRole.TEACHER) {
      const group = submission.homework.lesson.group;
      if (
        group.teacherId !== currentUser.sub &&
        group.supportTeacherId !== currentUser.sub
      ) {
        throw new ForbiddenException(
          'You can only view submissions for your own groups',
        );
      }
    }

    return submission;
  }

  async update(
    id: number,
    dto: UpdateHomeworkSubmissionDto,
    currentUser: JwtPayload,
  ) {
    const submission = await this.findOne(id, currentUser); // Initial security checks

    const updateData: any = { ...dto };

    // ROLE-BASED UPDATE LOGIC
    if (currentUser.role === UserRole.STUDENT) {
      // 1. Students cannot grade themselves
      delete updateData.score;

      // 2. Students cannot resubmit if already graded
      if (submission.score !== null) {
        throw new BadRequestException(
          'You cannot edit your submission after it has been graded',
        );
      }

      // Update submission time on resubmit
      updateData.submittedAt = new Date();
    } else if (
      [
        UserRole.TEACHER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.PLATFORM_ADMIN,
      ].includes(currentUser.role)
    ) {
      // Teachers shouldn't alter the student's file
      delete updateData.fileUrl;

      // Validate Grading
      if (dto.score !== undefined) {
        if (dto.score > submission.homework.maxScore) {
          throw new BadRequestException(
            `Score cannot exceed the maximum allowed score (${submission.homework.maxScore})`,
          );
        }
        // Auto-assign the grader's ID
        updateData.gradedBy = currentUser.sub;
      }
    }

    return this.prisma.homeworkSubmission.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const submission = await this.findOne(id, currentUser); // Security check

    if (currentUser.role === UserRole.STUDENT && submission.score !== null) {
      throw new BadRequestException(
        'You cannot delete your submission after it has been graded',
      );
    }

    return this.prisma.homeworkSubmission.delete({
      where: { id },
    });
  }
}
