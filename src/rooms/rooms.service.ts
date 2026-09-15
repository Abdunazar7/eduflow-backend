import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';
import { FindAllRoomsDto } from './dto/find-all-rooms.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto, currentUser: JwtPayload) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });

    if (!branch)
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);

    // Tenant Isolation: Ensure the branch belongs to the creator's organization
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      branch.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'Cannot create a room in a branch that does not belong to your organization',
      );
    }

    return this.prisma.room.create({
      data: dto,
    });
  }

  async findAll(query: FindAllRoomsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, search, branchId, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation via related Branch
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.branch = { tenantId: currentUser.tenantId };
    } else if (tenantId) {
      where.branch = { tenantId };
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: {
            select: { id: true, name: true, tenantId: true },
          },
          _count: {
            select: { groups: true }, // Useful for dashboard statistics
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.room.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        branch: {
          select: { id: true, name: true, tenantId: true },
        },
        _count: {
          select: { groups: true },
        },
      },
    });

    if (!room) throw new NotFoundException(`Room with ID ${id} not found`);

    // Authorization: Check if the room's branch belongs to the user's tenant
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      room.branch.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        'This room does not belong to your organization',
      );
    }

    return room;
  }

  async update(id: number, dto: UpdateRoomDto, currentUser: JwtPayload) {
    const room = await this.findOne(id, currentUser); // Reuses the security check

    // If changing the branch, verify the new branch belongs to the same tenant
    if (dto.branchId && dto.branchId !== room.branchId) {
      const newBranch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });

      if (!newBranch) throw new NotFoundException('New branch not found');
      if (
        currentUser.role !== UserRole.PLATFORM_ADMIN &&
        newBranch.tenantId !== currentUser.tenantId
      ) {
        throw new ForbiddenException(
          'Cannot move room to a branch outside your organization',
        );
      }
    }

    return this.prisma.room.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const room = await this.findOne(id, currentUser); // Security check

    // Database Integrity: Prevent deleting a room if groups are scheduled in it
    if (room._count.groups > 0) {
      throw new BadRequestException(
        `Cannot delete this room because ${room._count.groups} group(s) are currently assigned to it. Please reassign them first.`,
      );
    }

    return this.prisma.room.delete({
      where: { id },
    });
  }
}
