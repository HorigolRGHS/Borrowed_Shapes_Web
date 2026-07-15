import 'dotenv/config';
import { join } from 'node:path';
import { defineConfig } from '@mikro-orm/core';
import { EntityGenerator } from '@mikro-orm/entity-generator';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { CamelCaseNamingStrategy } from './common/camel-case-naming-strategy';
export default defineConfig({
  driver: PostgreSqlDriver,
  clientUrl: process.env.DATABASE_URL,
  extensions: [EntityGenerator],
  namingStrategy: CamelCaseNamingStrategy,
  entities: [join(__dirname, 'entities')],
  entitiesTs: [join(process.cwd(), 'src', 'entities')],
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './migrations',
    pathTs: './migrations',
  },
  entityGenerator: {
    path: './src/entities',
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30_000,
  },
});
