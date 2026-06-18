import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { FileAsset } from '../entities/FileAsset';
import { DownloadLog } from '../entities/DownloadLog';
import { DownloadStats } from '../entities/DownloadStats';

@Module({
  imports: [
    StorageModule,
    AuthModule,
    MikroOrmModule.forFeature([FileAsset, DownloadLog, DownloadStats]),
  ],
  controllers: [DownloadsController],
  providers: [DownloadsService],
})
export class DownloadsModule {}
