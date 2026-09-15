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
import { LeadStatusesService } from './lead-statuses.service';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { FindAllLeadStatusesDto } from './dto/find-all-lead-statuses.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Lead Statuses (CRM Columns)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('lead-statuses')
export class LeadStatusesController {
  constructor(private readonly service: LeadStatusesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a lead status (Kanban column)' })
  create(@Body() dto: CreateLeadStatusDto, @GetCurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all lead statuses (Combines Global + Tenant Specific)',
  })
  findAll(
    @Query() query: FindAllLeadStatusesDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get status details by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a status (Global statuses restricted to Platform Admin)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a status (Fails if leads are currently in this status)',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
