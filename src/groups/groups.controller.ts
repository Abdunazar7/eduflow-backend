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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { FindAllGroupsDto } from './dto/find-all-groups.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new group' })
  create(@Body() dto: CreateGroupDto, @GetCurrentUser() user: JwtPayload) {
    return this.groupsService.create(dto, user);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get all groups (Teachers only see their own)' })
  findAll(
    @Query() query: FindAllGroupsDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.groupsService.findAll(query, user);
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
    summary:
      'V1: Get all groups (teacher scoped) - new logic, old GET /groups stays',
  })
  @ApiResponse({ status: 200, description: 'List of groups (v1)' })
  findAllV1(@Query() query: any, @GetCurrentUser() user: JwtPayload) {
    return this.groupsService.findAll1(query, user);
  }

  @Get('v1/:id/students')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: 'V1: Get students of a group (teacher scoped) - new logic',
  })
  @ApiResponse({ status: 200, description: 'Students of group (v1)' })
  findStudentsByGroupV1(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.groupsService.findStudentsByGroup(id, currentUser);
  }

  @Get(':id/students')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  findStudentsByGroup(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() currentUser: JwtPayload,
  ) {
    return this.groupsService.findStudentsByGroup(id, currentUser);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get group details by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.groupsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a group' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.groupsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a group (Fails if enrollments exist)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.groupsService.remove(id, user);
  }
}
