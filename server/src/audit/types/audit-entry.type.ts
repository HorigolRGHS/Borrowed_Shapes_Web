import { AuditActionType } from '../../entities/AuditActionType';

export interface AuditEntryParams {
  userId?: string | null;
  actionType: AuditActionType;
  entityName: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string | null;
}
