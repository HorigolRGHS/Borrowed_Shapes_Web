import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WikiPage } from '../entities/WikiPage';
import { WikiRevision } from '../entities/WikiRevision';
import { AuditLog } from '../entities/AuditLog';
import { FileAsset } from '../entities/FileAsset';
import { User } from '../entities/User';
import { WikiAuditService } from './services/wiki-audit.service';
import { WikiService } from './services/wiki.service';
import { WikiRevisionService } from './services/wiki-revision.service';
import { WIKI_STORAGE } from './services/wiki-storage.service';
import { LocalDiskStorageService } from './services/local-disk-storage.service';
import { WikiAdminController } from './controllers/wiki-admin.controller';
import { WikiController } from './controllers/wiki.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([WikiPage, WikiRevision, AuditLog, FileAsset, User]),
  ],
  controllers: [WikiAdminController, WikiController],
  providers: [
    WikiAuditService,
    WikiService,
    WikiRevisionService,
    {
      provide: WIKI_STORAGE,
      useClass: LocalDiskStorageService,
    },
  ],
  exports: [WikiAuditService, WikiService, WikiRevisionService],
})
export class WikiModule {}
