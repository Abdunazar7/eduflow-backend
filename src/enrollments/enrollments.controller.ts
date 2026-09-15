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
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { FindAllEnrollmentsDto } from './dto/find-all-enrollments.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enroll a student in a group' })
  @ApiResponse({ status: 201, description: 'Enrollment created.' })
  create(@Body() dto: CreateEnrollmentDto, @GetCurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({
    summary:
      'Get enrollments (Context-aware: Students see theirs, Teachers see their groups)',
  })
  findAll(
    @Query() query: FindAllEnrollmentsDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get enrollment details by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update enrollment (e.g., Freeze, Drop)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnrollmentDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete enrollment (Hard delete, use caution)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
