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
import { WikiController } from './controllers/wiki.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([WikiPage, WikiRevision, AuditLog, FileAsset, User]),
  ],
  controllers: [WikiController],
  providers: [WikiAuditService, WikiService, WikiRevisionService],
  exports: [WikiAuditService, WikiService, WikiRevisionService],
})
export class WikiModule {}
