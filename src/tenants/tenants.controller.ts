import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { FindAllTenantsDto } from './dto/find-all-tenants.dto';
import { AccessTokenGuard} from '../commons/guards';
import { Roles, Public } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';
import { RolesGuard } from '../commons/guards/roles.guard';

@ApiTags("Tenants (O'quv Markazlari)")
@Controller('tenants')
// Default holatda barcha endpointlar tokenni talab qiladi
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN) // Faqat superadmin yarata oladi
  @ApiOperation({
    summary: "Yangi o'quv markazi yaratish (Faqat Platform Admin)",
  })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN) // Faqat superadmin hammasini ko'ra oladi
  @ApiOperation({
    summary: "Barcha o'quv markazlarini olish (Paginatsiya va Qidiruv)",
  })
  findAll(@Query() query: FindAllTenantsDto) {
    return this.tenantsService.findAll(query);
  }

  @Public() // Hech qanday token kerak emas (Frontend login pejida ishlatadi)
  @Get('by-subdomain/:subdomain')
  @ApiOperation({
    summary: "Subdomain orqali o'quv markazi logotipi va ma'lumotini olish",
  })
  findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.tenantsService.findBySubdomain(subdomain);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Markaz ma'lumotlarini ID orqali olish (Admin va Manager)",
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.tenantsService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Markaz ma'lumotlarini o'zgartirish" })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.tenantsService.update(id, dto, currentUser);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Markazni bloklash yoki faollashtirish (Soft Ban)' })
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Markazni butunlay o'chirish (Danger Zone)" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.remove(id);
  }
}
