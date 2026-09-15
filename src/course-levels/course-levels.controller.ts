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
import { CourseLevelsService } from './course-levels.service';
import { CreateCourseLevelDto } from './dto/create-course-level.dto';
import { UpdateCourseLevelDto } from './dto/update-course-level.dto';
import { FindAllCourseLevelsDto } from './dto/find-all-course-levels.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Course Levels')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('course-levels')
export class CourseLevelsController {
  constructor(private readonly courseLevelsService: CourseLevelsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new course level' })
  create(
    @Body() dto: CreateCourseLevelDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.courseLevelsService.create(dto, user);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get all course levels with pagination and search' })
  findAll(
    @Query() query: FindAllCourseLevelsDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.courseLevelsService.findAll(query, user);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get a course level by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.courseLevelsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a course level (Admins/Managers only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseLevelDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.courseLevelsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a course level (Fails if groups exist)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.courseLevelsService.remove(id, user);
  }
}
