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
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { FindAllAttendanceDto } from './dto/find-all-attendance.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Mark attendance for a single student' })
  create(@Body() dto: CreateAttendanceDto, @GetCurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Post('bulk')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary:
      'Bulk Upsert attendance for a whole class (Recommended for Frontend)',
  })
  bulkUpsert(
    @Body() dto: BulkAttendanceDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.bulkUpsert(dto, user);
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
    summary: 'Get attendance records (Students only see theirs)',
  })
  findAll(
    @Query() query: FindAllAttendanceDto,
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
  @ApiOperation({ summary: 'Get single attendance record' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Update existing attendance status' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove attendance record (Admin/Manager only)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }

  // ✅ NEW: V1 endpoints (teacher dashboard uchun)
  // Eski /attendance endpointlariga tegmaymiz.

  @Get('v1')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({
    summary:
      'V1: Get attendance records (lightweight, teacher checks by lessonId)',
  })
  @ApiResponse({ status: 200, description: 'Attendance list (v1)' })
  findAllV1(@Query() query: any, @GetCurrentUser() user: JwtPayload) {
    return this.service.findAll1(query, user);
  }

  @Post('v1/bulk')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: 'V1: Bulk upsert attendance (recommended for teacher dashboard)',
  })
  @ApiResponse({ status: 200, description: 'Bulk upsert result (v1)' })
  bulkUpsertV1(
    @Body() dto: BulkAttendanceDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.bulkUpsert(dto, user);
  }
}
