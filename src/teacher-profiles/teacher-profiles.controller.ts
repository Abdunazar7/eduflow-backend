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
import { TeacherProfilesService } from './teacher-profiles.service';
import { CreateTeacherProfileDto } from './dto/create-teacher-profile.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';
import { FindAllTeacherProfilesDto } from './dto/find-all-teacher-profiles.dto';

@ApiTags('Teacher Profiles')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('teacher-profiles')
export class TeacherProfilesController {
  constructor(private readonly service: TeacherProfilesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a teacher profile for an existing user' })
  create(
    @Body() dto: CreateTeacherProfileDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all teacher profiles (with pagination and search)',
  })
  findAll(
    @Query() query: FindAllTeacherProfilesDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(query, user);
  }

  @Get(':userId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get teacher profile by User ID' })
  findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(userId, user);
  }

  @Patch(':userId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary:
      'Update teacher profile (Teachers can only update bio/specialization)',
  })
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateTeacherProfileDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(userId, dto, user);
  }

  @Delete(':userId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete teacher profile' })
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(userId, user);
  }
}
