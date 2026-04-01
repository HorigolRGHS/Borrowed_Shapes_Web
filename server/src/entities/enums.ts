export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  LOGGED_OUT = 'LOGGED_OUT',
}

export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REVOKE_SESSION = 'REVOKE_SESSION',
}

export enum SessionResult {
  WIN = 'WIN',
  LOSE = 'LOSE',
  ABANDONED = 'ABANDONED',
}

export enum GameSessionStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  ABANDONED = 'ABANDONED',
}

export enum ForumThreadStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum ForumPostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

export enum ForumFlair {
  GENERAL = 'GENERAL',
  BUG_REPORT = 'BUG_REPORT',
  GUIDE = 'GUIDE',
  SUGGESTION = 'SUGGESTION',
  FAN_ART = 'FAN_ART',
  LOOKING_FOR_PARTY = 'LOOKING_FOR_PARTY',
  PATCH_NOTE = 'PATCH_NOTE',
}
