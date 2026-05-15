import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PresenceService } from './presence.service';
import { PresenceSyncJob } from './presence-sync.job';
import { PresenceController } from './presence.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceSyncJob],
  exports: [PresenceService],
})
export class PresenceModule {}
