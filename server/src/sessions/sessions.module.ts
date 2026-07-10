import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { UserSessionRepository } from './repositories/user-session.repository';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, UserSessionRepository],
  exports: [SessionsService, UserSessionRepository],
})
export class SessionsModule {}
