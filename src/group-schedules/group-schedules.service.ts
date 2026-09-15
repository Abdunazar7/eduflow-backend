import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupScheduleDto } from './dto/create-group-schedule.dto';
import { UpdateGroupScheduleDto } from './dto/update-group-schedule.dto';
import { FindAllGroupSchedulesDto } from './dto/find-all-group-schedules.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class GroupSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroupScheduleDto, currentUser: JwtPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
    });

    if (!group)
      throw new NotFoundException(`Group with ID ${dto.groupId} not found`);

    // Tenant Isolation Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot add a schedule to a group outside your organization',
      );
    }

    // Logical Time Validation
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) {
      throw new BadRequestException(
        'Start time must be strictly before end time',
      );
    }

    return this.prisma.groupSchedule.create({
      data: {
        ...dto,
        startTime: start,
        endTime: end,
      },
    });
  }

  async findAll(query: FindAllGroupSchedulesDto, currentUser: JwtPayload) {
    const { page = 1, limit = 50, groupId, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation (Chained through Group)
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.group = { tenantId: currentUser.tenantId };
    } else if (tenantId) {
      where.group = { tenantId };
    }

    if (groupId) {
      where.groupId = groupId;
    }

    const [data, total] = await Promise.all([
      this.prisma.groupSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { groupId: 'asc' },
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
        include: {
          group: { select: { id: true, name: true, tenantId: true } },
        },
      }),
      this.prisma.groupSchedule.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const schedule = await this.prisma.groupSchedule.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, tenantId: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    // Tenant Isolation Check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      schedule.group.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this schedule',
      );
    }

    return schedule;
  }

  async update(
    id: number,
    dto: UpdateGroupScheduleDto,
    currentUser: JwtPayload,
  ) {
    const schedule = await this.findOne(id, currentUser); // Reuses the security check

    let start = dto.startTime ? new Date(dto.startTime) : schedule.startTime;
    let end = dto.endTime ? new Date(dto.endTime) : schedule.endTime;

    if (start >= end) {
      throw new BadRequestException(
        'Start time must be strictly before end time',
      );
    }

    // If changing the group, verify the new group belongs to the same tenant
    if (dto.groupId && dto.groupId !== schedule.groupId) {
      const newGroup = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
      });
      if (!newGroup) throw new NotFoundException('New group not found');
      if (
        currentUser.role !== UserRole.PLATFORM_ADMIN &&
        newGroup.tenantId !== currentUser.tenantId
      ) {
        throw new ForbiddenException(
          'Cannot move schedule to a group outside your organization',
        );
      }
    }

    return this.prisma.groupSchedule.update({
      where: { id },
      data: {
        ...dto,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const schedule = await this.findOne(id, currentUser); // Security check

    return this.prisma.groupSchedule.delete({
      where: { id: schedule.id },
    });
  }
}
