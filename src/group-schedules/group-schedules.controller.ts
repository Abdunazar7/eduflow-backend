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
import { GroupSchedulesService } from './group-schedules.service';
import { CreateGroupScheduleDto } from './dto/create-group-schedule.dto';
import { UpdateGroupScheduleDto } from './dto/update-group-schedule.dto';
import { FindAllGroupSchedulesDto } from './dto/find-all-group-schedules.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';
import { RolesGuard } from '../commons/guards/roles.guard';

@ApiTags('Group Schedules')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('group-schedules')
export class GroupSchedulesController {
  constructor(private readonly service: GroupSchedulesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a schedule day to a group' })
  create(
    @Body() dto: CreateGroupScheduleDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  // Teachers and Students need to see the schedule to know when classes are
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get schedules with pagination and filtering' })
  findAll(
    @Query() query: FindAllGroupSchedulesDto,
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
  @ApiOperation({ summary: 'Get schedule by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update schedule (Time/Day validation included)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupScheduleDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a schedule' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
