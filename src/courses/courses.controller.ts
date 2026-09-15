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
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FindAllCoursesDto } from './dto/find-all-courses.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new course' })
  create(@Body() dto: CreateCourseDto, @GetCurrentUser() user: JwtPayload) {
    return this.coursesService.create(dto, user);
  }

  @Get()
  // Everyone in the tenant needs to see courses (Teachers for assignment, Students for catalog)
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get all courses with pagination and search' })
  findAll(
    @Query() query: FindAllCoursesDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.coursesService.findAll(query, user);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get a course by ID (includes levels)' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.coursesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a course' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.coursesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a course (Fails if levels exist)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.coursesService.remove(id, user);
  }
}
