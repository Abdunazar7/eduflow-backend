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
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { AccessTokenGuard } from '../commons/guards';
import { GetCurrentUserId, Roles } from '../commons/decorators';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Users (Foydalanuvchilar)')
// Butun controller uchun Guardlar va Swagger token talabini yoqamiz
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Yangi foydalanuvchi yaratish (Faqat Adminlar uchun)',
  })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Phone already exists' })
  create(
    @Body() dto: CreateUserDto,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.create(dto, currentUser);
  }

  @Get('me')
  @ApiOperation({ summary: 'My own profile' })
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  async me(
    @GetCurrentUserId() userId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    // findOne security check self uchun ok
    return this.usersService.findOne(userId, user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my own profile' })
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  async updateMe(
    @GetCurrentUserId() userId: number,
    @GetCurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto, user);
  }

  @Patch(':id/role')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary:
      "Foydalanuvchi rolini o'zgartirish (Juda xavfli operatsiya, faqat Manager/Platform Admin)",
  })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.updateRole(id, role, currentUser);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary:
      "Barcha foydalanuvchilarni olish (O'qituvchilar o'z o'quvchilarini ko'rishi mumkin)",
  })
  findAll(
    @Query() query: FindAllUsersDto,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: "Foydalanuvchi profilini to'liq olish" })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.findOne(id, currentUser);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  // Bu yerga @Roles yozmadik, chunki RolesGuard'da "requiredRoles" bo'lmasa hammaga ruxsat beriladi.
  // Har qanday tizimga kirgan odam o'z parolini o'zgartira olishi kerak.
  @ApiOperation({
    summary: "Joriy foydalanuvchining o'z parolini o'zgartirishi",
  })
  async changePassword(
    @GetCurrentUserId() userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Patch(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: "Foydalanuvchi ma'lumotlarini yangilash" })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Foydalanuvchini o'chirish (Faqat Manager va Platform Admin)",
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.remove(id, currentUser);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Foydalanuvchini bloklash yoki faollashtirish (Soft Ban)',
    description:
      "Faqat o'zidan past darajadagi va o'z o'quv markazidagi foydalanuvchilarni o'zgartirish mumkin. Bloklanganda foydalanuvchi avtomatik tizimdan chiqariladi.",
  })
  async toggleActive(
    @Param('id', ParseIntPipe) targetUserId: number,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.toggleActive(targetUserId, currentUser);
  }
}
