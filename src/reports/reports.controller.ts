import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { TenantScopeDto } from './dto/tenant-scope.dto';
import { GetCurrentUser, Roles } from '../commons/decorators';
import type { AuthUser } from '../commons/types';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Which tenant a tenant-level report covers.
   *
   * PLATFORM_ADMIN passes RolesGuard everywhere but has no tenant, so their
   * token carries tenantId 0. Previously that silently produced an all-zero
   * report; now they must say which tenant they mean.
   */
  private tenantOf(user: AuthUser, query: TenantScopeDto): number {
    if (user.role !== UserRole.PLATFORM_ADMIN) return user.tenantId;

    if (!query.tenantId) {
      throw new BadRequestException(
        'Platform admins must pass ?tenantId= to view a tenant report.',
      );
    }
    return query.tenantId;
  }

  @Get('tenant-analytics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Dashboard totals and 6-month trends' })
  getTenantAnalytics(
    @GetCurrentUser() user: AuthUser,
    @Query() query: TenantScopeDto,
  ) {
    return this.reportsService.getTenantAnalytics(this.tenantOf(user, query));
  }

  @Get('tenant-revenue')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Income, payment status and recent transactions' })
  getRevenueAnalytics(
    @GetCurrentUser() user: AuthUser,
    @Query() query: TenantScopeDto,
  ) {
    return this.reportsService.getRevenueAnalyticsByTenant(
      this.tenantOf(user, query),
    );
  }

  @Get('enrollments-trends')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Enrollment status split and 6-month trend' })
  getEnrollmentsTrends(
    @GetCurrentUser() user: AuthUser,
    @Query() query: TenantScopeDto,
  ) {
    return this.reportsService.getStudentEnrollmentTrends(
      this.tenantOf(user, query),
    );
  }

  @Get('teacher-performance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Groups, lessons, students and attendance per teacher' })
  getTeacherPerformance(
    @GetCurrentUser() user: AuthUser,
    @Query() query: TenantScopeDto,
  ) {
    return this.reportsService.getTeacherPerformance(this.tenantOf(user, query));
  }

  @Get('leads-metrics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Lead pipeline and conversion to enrolled students' })
  getLeadsMetrics(
    @GetCurrentUser() user: AuthUser,
    @Query() query: TenantScopeDto,
  ) {
    return this.reportsService.getLeadsMetrics(this.tenantOf(user, query));
  }

  @Get('super-admin-overview')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Platform-wide tenants, subscriptions and MRR' })
  superAdminOverview() {
    return this.reportsService.superAdminOverview();
  }

  @Get('platform-revenue-analytics')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Platform MRR, ARR, growth and churn' })
  revenueAnalytics() {
    return this.reportsService.revenueAnalytics();
  }
}
