import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WikiPage } from '../entities/WikiPage';
import { WikiRevision } from '../entities/WikiRevision';
import { AuditLog } from '../entities/AuditLog';
import { FileAsset } from '../entities/FileAsset';
import { User } from '../entities/User';
import {
  WikiService,
  WikiRevisionService,
  WikiAuditService,
} from './services/wiki.service';
import { WIKI_STORAGE } from './services/wiki-storage.service';
import { StorageModule } from '../storage/storage.module';
import { R2WikiStorageService } from './services/r2-wiki-storage.service';
import { WikiController } from './controllers/wiki.controller';
import { WikiPageRepository } from './repositories/wiki-page.repository';
import { WikiRevisionRepository } from './repositories/wiki-revision.repository';
import { WikiAuditRepository } from './repositories/wiki-audit.repository';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      WikiPage,
      WikiRevision,
      AuditLog,
      FileAsset,
      User,
    ]),
    StorageModule,
  ],
  controllers: [WikiController],
  providers: [
    WikiPageRepository,
    WikiRevisionRepository,
    WikiAuditRepository,
    WikiAuditService,
    WikiService,
    WikiRevisionService,
    {
      provide: WIKI_STORAGE,
      useClass: R2WikiStorageService,
    },
  ],
  exports: [
    WikiPageRepository,
    WikiRevisionRepository,
    WikiAuditRepository,
    WikiAuditService,
    WikiService,
    WikiRevisionService,
  ],
})
export class WikiModule {}
