import { Module, forwardRef } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { UserSessionRepository } from './repositories/user-session.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [SessionsController],
  providers: [SessionsService, UserSessionRepository],
  exports: [SessionsService, UserSessionRepository],
})
export class SessionsModule {}
