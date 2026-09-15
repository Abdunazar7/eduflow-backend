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
import { StaffProfilesService } from './staff-profiles.service';
import { CreateStaffProfileDto } from './dto/create-staff-profile.dto';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { FindAllStaffProfilesDto } from './dto/find-all-staff-profiles.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Staff Profiles')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('staff-profiles')
export class StaffProfilesController {
  constructor(private readonly staffProfilesService: StaffProfilesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary:
      'Create a staff profile for an existing user (Manager/Platform Admin only)',
  })
  create(
    @Body() dto: CreateStaffProfileDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.staffProfilesService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all staff profiles with pagination and search',
  })
  findAll(
    @Query() query: FindAllStaffProfilesDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.staffProfilesService.findAll(query, user);
  }

  @Get(':userId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a staff profile by User ID' })
  findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.staffProfilesService.findOne(userId, user);
  }

  @Patch(':userId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a staff profile (Salary/KPIs restricted to Managers)',
  })
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateStaffProfileDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.staffProfilesService.update(userId, dto, user);
  }

  @Delete(':userId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Delete a staff profile (Manager/Platform Admin only)',
  })
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.staffProfilesService.remove(userId, user);
  }
}
