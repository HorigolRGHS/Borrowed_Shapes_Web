import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../lib/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Declaration merging: tells TypeScript that PrismaService has all PrismaClient model properties.
// Required because TypeScript doesn't infer them automatically when extending PrismaClient.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PrismaService extends PrismaClient {}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30_000,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
