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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { FindAllBranchesDto } from './dto/find-all-branches.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Branches (Filiallar)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: "Yangi filial qo'shish" })
  create(@Body() dto: CreateBranchDto, @GetCurrentUser() user: JwtPayload) {
    return this.branchesService.create(dto, user);
  }

  @Get()
  // Filiallar ro'yxatini hamma ko'rishi mumkin (Teacher qaysi filialga borishini bilishi kerak)
  @ApiOperation({
    summary: 'Barcha filiallarni olish (Paginatsiya, Statistika)',
  })
  findAll(
    @Query() query: FindAllBranchesDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.branchesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Filial ma'lumotini ID orqali olish" })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.branchesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: "Filial ma'lumotlarini tahrirlash" })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.branchesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER) // Admin o'chira olmasin, faqat Manager yoki Platform Admin
  @ApiOperation({ summary: "Filialni o'chirish" })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.branchesService.remove(id, user);
  }
}
