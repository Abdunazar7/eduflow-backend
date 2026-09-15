import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { FindAllBranchesDto } from './dto/find-all-branches.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Filial yaratish
  async create(dto: CreateBranchDto, currentUser: JwtPayload) {
    // Tenant ID ni avtomatik aniqlash
    const targetTenantId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? dto.tenantId
        : currentUser.tenantId;

    if (!targetTenantId) {
      throw new BadRequestException(
        "O'quv markazi (tenantId) biriktirilishi shart",
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });

    if (!tenant) throw new NotFoundException("O'quv markazi topilmadi");

    return this.prisma.branch.create({
      data: {
        ...dto,
        tenantId: targetTenantId,
      },
    });
  }

  // 2. Barchasini olish (Dashboard uchun statistika, qidiruv va paginatsiya bilan)
  async findAll(query: FindAllBranchesDto, currentUser: JwtPayload) {
    const { page = 1, limit = 10, search, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant izolyatsiyasi
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    // Qidiruv
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { rooms: true, groups: true }, // Filialda nechta xona va guruh borligi (Frontend uchun ajoyib)
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  // 3. Bitta filialni to'liq olish
  async findOne(id: number, currentUser: JwtPayload) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        rooms: true,
        _count: { select: { groups: true } },
      },
    });

    if (!branch) throw new NotFoundException('Filial topilmadi');

    // Begona tenant tekshiruvi
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      branch.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException(
        "Bu filial ma'lumotlarini ko'rish ruxsat etilmaydi",
      );
    }

    return branch;
  }

  // 4. Filialni tahrirlash
  async update(id: number, dto: UpdateBranchDto, currentUser: JwtPayload) {
    const branch = await this.findOne(id, currentUser); // Avval borligini va ruxsatni tekshiramiz

    // Tenantni o'zgartirish faqat superadminga ruxsat
    if (dto.tenantId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      delete dto.tenantId;
    }

    return this.prisma.branch.update({
      where: { id: branch.id },
      data: dto,
    });
  }

  // 5. O'chirish (Agar unga guruhlar bog'langan bo'lsa, o'chirishga yo'l qo'ymaymiz)
  async remove(id: number, currentUser: JwtPayload) {
    const branch = await this.findOne(id, currentUser);

    // Relational xavfsizlik: xonalar yoki guruhlar bog'langan filialni o'chirib yuborish bazani buzadi
    const relatedGroups = await this.prisma.group.count({
      where: { branchId: branch.id },
    });
    if (relatedGroups > 0) {
      throw new BadRequestException(
        "Ushbu filialni o'chirib bo'lmaydi, chunki unga bog'langan guruhlar mavjud.",
      );
    }

    return this.prisma.branch.delete({
      where: { id: branch.id },
    });
  }
}
