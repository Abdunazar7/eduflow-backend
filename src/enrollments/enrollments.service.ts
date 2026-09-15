import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEnrollmentDto,
  EnrollmentStatus,
} from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { FindAllEnrollmentsDto } from './dto/find-all-enrollments.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnrollmentDto, currentUser: JwtPayload) {
    // 1. Validate Student
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
      include: { studentProfile: true },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      throw new BadRequestException('Valid student not found');
    }

    // 2. Validate Group & Course Level
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: { courseLevel: true },
    });

    if (!group) throw new NotFoundException('Group not found');

    // 3. Cross-Tenant Validation
    if (student.tenantId !== group.tenantId) {
      throw new BadRequestException(
        'Student and Group do not belong to the same organization',
      );
    }
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      student.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot enroll a student outside your organization',
      );
    }

    // 4. Prevent duplicate active enrollments
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: dto.studentId,
        groupId: dto.groupId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(
        'Student is already actively enrolled in this group',
      );
    }

    // 5. Smart Pricing Logic: Calculate final contract price if not explicitly provided
    let finalPrice = dto.contractPrice;
    if (finalPrice === undefined || finalPrice === null) {
      const basePrice = Number(group.courseLevel.price);
      const discountPercent = student.studentProfile?.discountPercent || 0;
      finalPrice = basePrice - (basePrice * discountPercent) / 100;
    }

    return this.prisma.enrollment.create({
      data: {
        ...dto,
        contractPrice: finalPrice,
        joinedAt: new Date(dto.joinedAt),
      },
    });
  }

  async findAll(query: FindAllEnrollmentsDto, currentUser: JwtPayload) {
    const {
      page = 1,
      limit = 10,
      groupId,
      studentId,
      status,
      tenantId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Base Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.student = { tenantId: currentUser.tenantId };
    } else if (tenantId) {
      where.student = { tenantId };
    }

    // Role-based contextual isolation
    if (currentUser.role === UserRole.STUDENT) {
      where.studentId = currentUser.sub; // Students only see their own enrollments
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (currentUser.role === UserRole.TEACHER) {
      // Teachers only see enrollments for groups they teach
      where.group = {
        OR: [
          { teacherId: currentUser.sub },
          { supportTeacherId: currentUser.sub },
        ],
      };
    }

    if (groupId) where.groupId = groupId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          group: {
            select: {
              id: true,
              name: true,
              status: true,
              courseLevel: {
                select: {
                  name: true,
                  course: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            tenantId: true,
          },
        },
        group: { include: { courseLevel: { include: { course: true } } } },
      },
    });

    if (!enrollment)
      throw new NotFoundException(`Enrollment with ID ${id} not found`);

    // Tenant Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      enrollment.student.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied to this enrollment record');
    }

    // Student Check
    if (
      currentUser.role === UserRole.STUDENT &&
      enrollment.studentId !== currentUser.sub
    ) {
      throw new ForbiddenException('You can only view your own enrollments');
    }

    // Teacher Check
    if (
      currentUser.role === UserRole.TEACHER &&
      enrollment.group.teacherId !== currentUser.sub &&
      enrollment.group.supportTeacherId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You can only view enrollments for your own groups',
      );
    }

    return enrollment;
  }

  async update(id: number, dto: UpdateEnrollmentDto, currentUser: JwtPayload) {
    const enrollment = await this.findOne(id, currentUser); // Reuses security checks

    return this.prisma.enrollment.update({
      where: { id },
      data: {
        ...dto,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
      },
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const enrollment = await this.findOne(id, currentUser); // Security checks

    // In a billing/academic system, hard deleting an enrollment is dangerous if transactions are attached.
    // However, if we must delete, Prisma handles cascading or throwing errors if it's strictly linked.
    return this.prisma.enrollment.delete({ where: { id: enrollment.id } });
  }
}
