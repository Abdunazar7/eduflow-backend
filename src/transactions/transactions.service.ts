import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransactionDto,
  TransactionType,
} from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindAllTransactionsDto } from './dto/find-all-transactions.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';
import { TransactionStatus } from './enums/transaction.enums';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransactionDto, currentUser: JwtPayload) {
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    if (!targetTenantId) throw new BadRequestException('Tenant ID is required');

    let isStudentPayment = false;

    // Validate related user if provided
    if (dto.userId) {
      const relatedUser = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        include: { studentProfile: true },
      });

      if (!relatedUser) throw new NotFoundException('Related user not found');
      if (relatedUser.tenantId !== targetTenantId) {
        throw new ForbiddenException(
          'Cannot process transactions for users outside your organization',
        );
      }

      if (relatedUser.role === UserRole.STUDENT) {
        isStudentPayment = true;
      }
    }

    // Execute safely within a database transaction
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          tenantId: targetTenantId,
          userId: dto.userId,
          amount: dto.amount,
          type: dto.type,
          category: dto.category,
          paymentMethod: dto.paymentMethod,
          invoiceNumber: dto.invoiceNumber ?? null,
          status: dto.status ?? TransactionStatus.PAID,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          notes: dto.notes ?? null,
          createdBy: currentUser.sub,
        },
      });

      // existing student-balance adjustment logic stays the same
      if (isStudentPayment) {
        const adjustment =
          dto.type === TransactionType.INCOME ? dto.amount : -dto.amount;

        await tx.studentProfile.update({
          where: { userId: dto.userId },
          data: { balance: { increment: adjustment } },
        });
      }

      return transaction;
    });
  }

  async findAll(query: FindAllTransactionsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 20, userId, type, tenantId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant Isolation
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    // Role Visibility limits
    if (
      currentUser.role === UserRole.STUDENT ||
      currentUser.role === UserRole.TEACHER
    ) {
      where.userId = currentUser.sub; // End-users can only see their own receipts/payouts
    } else if (userId) {
      where.userId = userId;
    }

    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          creator: { select: { id: true, firstName: true, lastName: true } },
          tenant: { select: { id: true, name: true, subdomain: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!transaction)
      throw new NotFoundException(`Transaction with ID ${id} not found`);

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      transaction.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (
      (currentUser.role === UserRole.STUDENT ||
        currentUser.role === UserRole.TEACHER) &&
      transaction.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('You can only view your own transactions');
    }

    return transaction;
  }

  async update(id: number, dto: UpdateTransactionDto, currentUser: JwtPayload) {
    const transaction = await this.findOne(id, currentUser); // Reuses security checks

    // DTO inherently blocks updating amount/type, so we are safe to just apply the patch (e.g., fixing a category)
    return this.prisma.transaction.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const transaction = await this.findOne(id, currentUser); // Security check

    return this.prisma.$transaction(async (tx) => {
      // Revert student balance if we are deleting their transaction
      if (transaction.userId) {
        const relatedUser = await tx.user.findUnique({
          where: { id: transaction.userId },
        });

        if (relatedUser?.role === UserRole.STUDENT) {
          const reversal =
            transaction.type === TransactionType.INCOME
              ? -Number(transaction.amount)
              : Number(transaction.amount);

          await tx.studentProfile.update({
            where: { userId: transaction.userId },
            data: { balance: { increment: reversal } },
          });
        }
      }

      return tx.transaction.delete({ where: { id } });
    });
  }
}
