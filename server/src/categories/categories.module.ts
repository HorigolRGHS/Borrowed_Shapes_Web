import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CategoryService } from './categories.service';
import { CategoryController } from './categories.controller';
import { ForumCategory } from '../entities/ForumCategory';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

import { ForumCategoryRepository } from './repositories/categories.repository';

@Module({
  imports: [
    MikroOrmModule.forFeature([ForumCategory]),
    AuthModule,
    StorageModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryService, ForumCategoryRepository],
  exports: [CategoryService, ForumCategoryRepository],
})
export class CategoryModule {}
