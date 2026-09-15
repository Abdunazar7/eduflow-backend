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
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles, Public } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../commons/guards/roles.guard';

@ApiTags('Subscription Plans')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN) // Only Super Admin can create pricing tiers
  @ApiOperation({
    summary: 'Create a new subscription plan (Platform Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Plan created successfully.' })
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.create(dto);
  }

  @Public() // Available to everyone (e.g., for the public landing page pricing section)
  @Get()
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'List of plans including usage statistics.',
  })
  findAll() {
    return this.subscriptionPlansService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get subscription plan details by ID' })
  @ApiResponse({ status: 200, description: 'Plan details.' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN) // Only Super Admin can modify prices/limits
  @ApiOperation({ summary: 'Update a subscription plan (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully.' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN) // Only Super Admin can delete plans
  @ApiOperation({ summary: 'Delete a subscription plan (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete a plan with active subscribers.',
  })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionPlansService.remove(id);
  }
}
