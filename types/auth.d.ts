// types/auth.d.ts - CORRECTED VERSION
// InvenStock - Authentication Type Definitions

export interface User {
  id: string;
  email?: string;             // ✅ Optional ตรงกับ Schema
  username: string;           // ✅ Required ตรงกับ Schema
  firstName: string;
  lastName: string;
  phone?: string;
  status: UserStatus;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Computed fields (ไม่อยู่ใน Database)
  fullName?: string;          // firstName + lastName
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

// ✅ Authentication Requests
export interface LoginRequest {
  username: string;           // Primary credential
  password: string;
  organizationId?: string;    // Optional context switching
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  organizations: OrganizationUser[];
  currentOrganization?: Organization;  // If organizationId provided
  message?: string;
}

export interface RegisterRequest {
  username: string;           // ✅ Required
  password: string;
  firstName: string;
  lastName: string;
  email?: string;             // ✅ Optional
  phone?: string;
  organizationName?: string;  // Create new org if provided
}

export interface RegisterResponse {
  success: boolean;
  user: User;
  token?: string;
  organization?: Organization;
  requiresApproval: boolean;
  message?: string;
}

// ✅ Multi-tenant Context
export interface AuthContextType {
  user: User | null;
  currentOrganization: Organization | null;
  organizations: OrganizationUser[];
  loading: boolean;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ✅ JWT Payload
export interface JWTPayload {
  userId: string;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  organizationId?: string;    // Current active organization
  roleId?: string;            // Current role in active org
  permissions?: string[];     // Current permissions
  iat?: number;
  exp?: number;
}

// ✅ Invitation Interface
export interface UserInvitation {
  id: string;
  organizationId: string;
  inviterId: string;
  inviteeId?: string;
  inviteeEmail?: string;      // ✅ Optional
  inviteeUsername?: string;   // ✅ Optional
  roleId?: string;
  message?: string;
  status: InvitationStatus;
  expiresAt: Date;
  respondedAt?: Date;
  response?: string;
  createdAt: Date;
  updatedAt: Date;
  organization: Organization;
  inviter: User;
  invitee?: User;
}

// Role & Permission interfaces
export interface OrganizationRole {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: ColorTheme;         // ✅ ใช้ enum
  icon?: IconType;            // ✅ ใช้ enum
  position: number;
  isDefault: boolean;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: OrganizationRolePermission[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  allowed: boolean;
  permission: Permission;
}

export interface Permission {
  id: string;
  categoryId: string;
  name: string;              // "products.create"
  displayName: string;       // "สร้างสินค้าใหม่"
  description?: string;
  action: PermissionAction;
  resource: string;          // "products"
  isWildcard: boolean;
  category: PermissionCategory;
}

export interface PermissionCategory {
  id: string;
  name: string;             // "products"
  displayName: string;      // "การจัดการสินค้า"
  description?: string;
  icon?: string;
  sortOrder: number;
}

// ✅ Enums ตรงกับ Prisma Schema
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

export enum ColorTheme {
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  RED = 'RED',
  YELLOW = 'YELLOW',
  PURPLE = 'PURPLE',
  PINK = 'PINK',
  INDIGO = 'INDIGO',
  TEAL = 'TEAL',
  ORANGE = 'ORANGE',
  GRAY = 'GRAY',
  SLATE = 'SLATE',
  EMERALD = 'EMERALD'
}

export enum IconType {
  BUILDING = 'BUILDING',
  HOSPITAL = 'HOSPITAL',
  PHARMACY = 'PHARMACY',
  WAREHOUSE = 'WAREHOUSE',
  LABORATORY = 'LABORATORY',
  PILL = 'PILL',
  BOTTLE = 'BOTTLE',
  SYRINGE = 'SYRINGE',
  BANDAGE = 'BANDAGE',
  STETHOSCOPE = 'STETHOSCOPE',
  CROWN = 'CROWN',
  SHIELD = 'SHIELD',
  PERSON = 'PERSON',
  EYE = 'EYE',
  GEAR = 'GEAR',
  BOX = 'BOX',
  FOLDER = 'FOLDER',
  TAG = 'TAG',
  STAR = 'STAR',
  HEART = 'HEART',
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  TRIANGLE = 'TRIANGLE'
}