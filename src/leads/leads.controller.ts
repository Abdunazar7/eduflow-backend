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
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FindAllLeadsDto } from './dto/find-all-leads.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Leads (CRM)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new lead' })
  create(@Body() dto: CreateLeadDto, @GetCurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all leads with filtering, search, and pagination',
  })
  findAll(@Query() query: FindAllLeadsDto, @GetCurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get lead details by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update lead (e.g., change status, assign user)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a lead' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
