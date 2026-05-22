import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WikiPage } from '../entities/WikiPage';
import { WikiRevision } from '../entities/WikiRevision';
import { AuditLog } from '../entities/AuditLog';
import { FileAsset } from '../entities/FileAsset';
import { User } from '../entities/User';

@Module({
  imports: [
    MikroOrmModule.forFeature([WikiPage, WikiRevision, AuditLog, FileAsset, User]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class WikiModule {}
