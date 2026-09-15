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
import { HomeworksService } from './homeworks.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { FindAllHomeworksDto } from './dto/find-all-homeworks.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Homeworks')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('homeworks')
export class HomeworksController {
  constructor(private readonly homeworksService: HomeworksService) {}

  @Post()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Create a homework assignment for a lesson' })
  @ApiResponse({ status: 201, description: 'Homework created.' })
  create(@Body() dto: CreateHomeworkDto, @GetCurrentUser() user: JwtPayload) {
    return this.homeworksService.create(dto, user);
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
    summary: 'Get all homeworks (Contextual: Students/Teachers see their own)',
  })
  findAll(
    @Query() query: FindAllHomeworksDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.homeworksService.findAll(query, user);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get homework details' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.homeworksService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: 'Update a homework assignment (Teachers only edit their own)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHomeworkDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.homeworksService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: 'Delete a homework assignment (Fails if submissions exist)',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.homeworksService.remove(id, user);
  }
}
