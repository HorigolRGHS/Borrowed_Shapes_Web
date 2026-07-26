import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PresenceSyncJob } from './presence-sync.job';
import { PresenceController } from './presence.controller';
import { UserOnlineStatusRepository } from './repositories/user-online-status.repository';

@Module({
  imports: [],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceSyncJob, UserOnlineStatusRepository],
  exports: [PresenceService, UserOnlineStatusRepository],
})
export class PresenceModule {}
