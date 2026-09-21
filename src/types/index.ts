export type UserRoleKey = 'manager' | 'executive';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roleKey: UserRoleKey;
  roleName: string;
  permissions: string[];
  executiveProfile?: {
    code?: string | null;
    phone?: string | null;
  } | null;
}

export type AreaFilter = 'all' | 'tv' | 'gplus';

export interface AuditLogData {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string | null;
}
