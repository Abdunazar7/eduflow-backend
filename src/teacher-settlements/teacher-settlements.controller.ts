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
import { TeacherSettlementsService } from './teacher-settlements.service';
import { CreateTeacherSettlementDto } from './dto/create-teacher-settlement.dto';
import { UpdateTeacherSettlementDto } from './dto/update-teacher-settlement.dto';
import { FindAllTeacherSettlementsDto } from './dto/find-all-teacher-settlements.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Teacher Settlements (Payroll)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('teacher-settlements')
export class TeacherSettlementsController {
  constructor(private readonly service: TeacherSettlementsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a salary settlement record for a teacher' })
  create(
    @Body() dto: CreateTeacherSettlementDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get settlements (Teachers only see their own)' })
  findAll(
    @Query() query: FindAllTeacherSettlementsDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(query, user);
  }

  // Static /v1 paths must be declared before the :id routes, or
  // ':id' matches the literal "v1" and the integer parse rejects it.
  @Get('v1')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: 'V1: Get settlements (Teachers only see their own) - lightweight',
  })
  @ApiResponse({ status: 200, description: 'Settlements list (v1)' })
  findAllV1(@Query() query: any, @GetCurrentUser() user: JwtPayload) {
    return this.service.findAll1(query, user);
  }

  @Get('v1/:id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'V1: Get settlement details (teacher scoped)' })
  @ApiResponse({ status: 200, description: 'Settlement details (v1)' })
  findOneV1(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne1(id, user);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get settlement details' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update settlement (e.g., mark as PAID)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherSettlementDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete settlement (Fails if status is PAID)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }

  // ✅ NEW: V1 endpoints (teacher dashboard uchun)
  // Eski /teacher-settlements endpointlariga tegmaymiz.
}
