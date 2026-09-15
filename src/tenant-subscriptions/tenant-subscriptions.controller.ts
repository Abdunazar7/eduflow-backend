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
import { TenantSubscriptionsService } from './tenant-subscriptions.service';
import { CreateTenantSubscriptionDto } from './dto/create-tenant-subscription.dto';
import { UpdateTenantSubscriptionDto } from './dto/update-tenant-subscription.dto';
import { FindAllTenantSubscriptionsDto } from './dto/find-all-tenant-subscriptions.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';

@ApiTags('Tenant Subscriptions (Billing)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('tenant-subscriptions')
export class TenantSubscriptionsController {
  constructor(private readonly service: TenantSubscriptionsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN) // Only Super Admin can assign/sell plans
  @ApiOperation({
    summary: 'Assign a subscription to a tenant (Platform Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Subscription created.' })
  create(@Body() dto: CreateTenantSubscriptionDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get subscriptions (Managers see their own, Admins see all)',
  })
  findAll(
    @Query() query: FindAllTenantSubscriptionsDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get subscription details' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN) // Only Super Admin can modify active subscriptions
  @ApiOperation({
    summary: 'Update subscription details (Platform Admin only)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantSubscriptionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: 'Cancel a subscription (Soft delete/Status change)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription marked as cancelled.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
