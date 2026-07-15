import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { FileAsset } from '../entities/FileAsset';
import { DownloadLog } from '../entities/DownloadLog';
import { DownloadStats } from '../entities/DownloadStats';
import { User } from '../entities/User';
import { FileAssetRepository } from './repositories/file-asset.repository';
import { DownloadLogRepository } from './repositories/download-log.repository';
import { DownloadStatsRepository } from './repositories/download-stats.repository';

@Module({
  imports: [
    StorageModule,
    AuthModule,
    MikroOrmModule.forFeature([FileAsset, DownloadLog, DownloadStats, User]),
  ],
  controllers: [DownloadsController],
  providers: [
    DownloadsService,
    FileAssetRepository,
    DownloadLogRepository,
    DownloadStatsRepository,
  ],
  exports: [
    DownloadsService,
    FileAssetRepository,
    DownloadLogRepository,
    DownloadStatsRepository,
  ],
})
export class DownloadsModule {}
