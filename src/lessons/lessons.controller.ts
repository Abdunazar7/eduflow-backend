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
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { FindAllLessonsDto } from './dto/find-all-lessons.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly service: LessonsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a lesson manually' })
  create(@Body() dto: CreateLessonDto, @GetCurrentUser() user: JwtPayload) {
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
    summary: 'Get lessons (Context-aware: Students/Teachers see their own)',
  })
  findAll(
    @Query() query: FindAllLessonsDto,
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
  @ApiOperation({
    summary: 'Get lesson details including attendance and homework',
  })
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
  @ApiOperation({
    summary: 'Update lesson (Teachers can update topics/status)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLessonDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete lesson (Fails if attendance records exist)',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
