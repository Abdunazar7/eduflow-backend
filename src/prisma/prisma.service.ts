import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    super({
      adapter: new PrismaPg(pool),
      // Credentials are left out of every User query by default. Without this,
      // any endpoint that returned a user row (including /users/me) sent the
      // password hash to the browser. The few queries that genuinely need them
      // (login, refresh, change password) opt back in with
      // `omit: { passwordHash: false }` / `omit: { hashedRt: false }`.
      omit: { user: { passwordHash: true, hashedRt: true } },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
