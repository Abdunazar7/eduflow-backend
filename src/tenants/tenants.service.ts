import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { FindAllTenantsDto } from './dto/find-all-tenants.dto';
import { JwtPayload } from '../commons/types';
import { UserRole } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Yaratish (Faqat Platform Admin uchun)
  async create(dto: CreateTenantDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain: dto.subdomain },
    });

    if (existingTenant) {
      throw new ConflictException('Ushbu subdomain allaqachon band');
    }

    return this.prisma.tenant.create({ data: dto });
  }

  // 2. Barchasini olish (Paginatsiya, Qidiruv, Filter)
  async findAll(query: FindAllTenantsDto) {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true, groups: true, branches: true }, // Statistikani ham qo'shib beramiz
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  // 3. Subdomain orqali topish (Frontend login pejidan oldin ishlatadi)
  async findBySubdomain(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logoUrl: true,
        contactPhone: true,
        isActive: true, // Frontend shunga qarab "Tizim vaqtincha yopiq" deb chiqarishi mumkin
      },
    });

    if (!tenant) throw new NotFoundException("O'quv markazi topilmadi");
    return tenant;
  }

  // 4. ID orqali bitta markazni to'liq olinishi
  async findOne(id: number, currentUser: JwtPayload) {
    // Tenant izolyatsiyasi: Agar Manager bo'lsa, faqat o'zinikini ko'ra oladi
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.tenantId !== id
    ) {
      throw new ForbiddenException(
        "Boshqa o'quv markazi ma'lumotlarini ko'rish taqiqlanadi",
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        branches: true,
        settings: true,
        subscriptions: {
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1,
        }, // Hozirgi obuna holatini ham ko'rsatamiz
      },
    });

    if (!tenant) throw new NotFoundException("O'quv markazi topilmadi");
    return tenant;
  }

  // 5. Yangilash (Update)
  async update(id: number, dto: UpdateTenantDto, currentUser: JwtPayload) {
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.tenantId !== id
    ) {
      throw new ForbiddenException(
        "Faqat o'z o'quv markazingizni tahrirlay olasiz",
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("O'quv markazi topilmadi");

    if (dto.subdomain && dto.subdomain !== tenant.subdomain) {
      const existing = await this.prisma.tenant.findUnique({
        where: { subdomain: dto.subdomain },
      });
      if (existing) throw new ConflictException('Bu subdomain allaqachon band');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  // 6. Bloklash / Faollashtirish (Soft Ban)
  async toggleActive(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("O'quv markazi topilmadi");

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });
  }

  // 7. Butunlay o'chirish (Hard Delete) - Juda xavfli operatsiya
  async remove(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("O'quv markazi topilmadi");

    return this.prisma.tenant.delete({ where: { id } });
  }
}
