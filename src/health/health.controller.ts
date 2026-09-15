import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../commons/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up and serving. */
  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }

  /**
   * Readiness: the process can actually reach the database. Point the VPS
   * uptime monitor here, not at `/health` — a process that is up but cannot
   * query Postgres serves errors to every user.
   */
  @Public()
  @SkipThrottle()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks the database)' })
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up' };
  }
}
