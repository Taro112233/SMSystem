// types/auth.d.ts
// InvenStock - Authentication Type Definitions

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  status: UserStatus;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  lastLoginIp?: string;
  language: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  primaryColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  status: OrganizationStatus;
  timezone: string;
  currency: string;
  allowDepartments: boolean;
  allowCustomRoles: boolean;
  allowGuestAccess: boolean;
  maxUsers?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationUser {
  id: string;
  organizationId: string;
  userId: string;
  isOwner: boolean;
  joinedAt: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  organization: Organization;
  user: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  organizationId?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  organizations: OrganizationUser[];
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  organizationName?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: User;
  token: string;
  organization?: Organization;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  organizations: OrganizationUser[];
  loading: boolean;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  organizationId?: string;
  departmentId?: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  allowed: boolean;
}

export interface OrganizationRole {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  position: number;
  isDefault: boolean;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: RolePermission[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enums (should match Prisma schema)
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE'
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL'
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  MANAGE = 'MANAGE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT'
}