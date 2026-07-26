import { AuditModule } from './audit.module';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditService } from './audit.service';
import { AuthModule } from '../auth/auth.module';
describe('AuditModule Architecture Verification', () => {
  it('AuditModule should provide AuditLogRepository exactly once', () => {
    const providers = Reflect.getMetadata('providers', AuditModule) || [];
    const repoProviders = providers.filter(
      (p: any) =>
        p === AuditLogRepository || (p && p.provide === AuditLogRepository),
    );
    expect(repoProviders.length).toBe(1);
  });

  it('AuditModule should export AuditLogRepository and AuditService', () => {
    const exportsArr = Reflect.getMetadata('exports', AuditModule) || [];
    const exportedTokens = exportsArr.map((e: any) =>
      e && e.provide ? e.provide : e,
    );
    expect(exportedTokens).toContain(AuditLogRepository);
    expect(exportedTokens).toContain(AuditService);
  });

  it('AuthModule should not provide AuditLogRepository', () => {
    const authProviders = Reflect.getMetadata('providers', AuthModule) || [];
    const repoProviders = authProviders.filter(
      (p: any) =>
        p === AuditLogRepository || (p && p.provide === AuditLogRepository),
    );
    expect(repoProviders.length).toBe(0);
  });
});
