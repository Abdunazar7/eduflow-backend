import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { CreateSystemSettingDto } from './dto/create-system-setting.dto';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('System Settings (API Keys & Config)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly service: SystemSettingsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Create settings for a tenant (Managers create their own)',
  })
  create(
    @Body() dto: CreateSystemSettingDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get('my-settings')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Get settings for the currently authenticated manager's school",
  })
  getMySettings(@GetCurrentUser() user: JwtPayload) {
    return this.service.getMySettings(user);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: 'Get all system settings (Platform Admin strictly)',
  })
  findAll(@GetCurrentUser() user: JwtPayload) {
    return this.service.findAll(user);
  }

  @Get(':tenantId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get settings by Tenant ID' })
  findOne(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(tenantId, user);
  }

  @Patch(':tenantId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update settings (e.g., set new Telegram Token)' })
  update(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: UpdateSystemSettingDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(tenantId, dto, user);
  }

  @Delete(':tenantId')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Delete settings entirely (Platform Admin only)' })
  remove(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(tenantId, user);
  }
}
