// app/utils/auth-client.ts - FIXED VERSION
// InvenStock - Client-side Authentication Utilities

export interface User {
  id: string;
  email: string;
  username?: string;           // ✅ Optional ตาม Schema
  firstName: string;
  lastName: string;
  fullName: string;           // Computed field
  status: string;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: string;
  timezone: string;
  currency: string;
}

export interface OrganizationUser {
  id: string;
  organizationId: string;
  userId: string;
  isOwner: boolean;
  joinedAt: Date;
  isActive: boolean;
  organization: Organization;
}

// 🔥 FIXED: เปลี่ยนจาก username เป็น email
export interface LoginRequest {
  email: string;              // ✅ ตรงกับ Schema
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  token: string;
  organizations?: OrganizationUser[]; // Organizations ของ user
}

export interface RegisterRequest {
  email: string;
  username?: string;          // ✅ Optional
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;  // สำหรับสร้าง org ใหม่
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string;            // ไม่มีถ้า requiresApproval = true
  organization?: Organization;
  requiresApproval: boolean;
}

export interface AuthError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// ===== API CLIENT FUNCTIONS =====

/**
 * Login user with email and password
 */
export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

/**
 * Register new user
 */
export async function registerUser(userData: RegisterRequest): Promise<RegisterResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  return data;
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Logout failed');
  }
}

/**
 * Get current user information with organizations
 */
export async function getCurrentUser(): Promise<{
  user: User;
  organizations: OrganizationUser[];
  currentOrganization?: Organization;
}> {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get user info');
  }

  return data;
}

/**
 * Switch to different organization
 */
export async function switchOrganization(organizationId: string): Promise<{
  organization: Organization;
  permissions: string[];
}> {
  const response = await fetch('/api/auth/switch-organization', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ organizationId }),
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to switch organization');
  }

  return data;
}

// ===== CLIENT-SIDE STORAGE HELPERS =====

export function storeUserData(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_data', JSON.stringify(user));
  }
}

export function storeOrganizationData(organization: Organization): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('current_organization', JSON.stringify(organization));
  }
}

export function getStoredUserData(): User | null {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
}

export function getStoredOrganizationData(): Organization | null {
  if (typeof window !== 'undefined') {
    const orgData = localStorage.getItem('current_organization');
    return orgData ? JSON.parse(orgData) : null;
  }
  return null;
}

export function clearStoredUserData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_data');
    localStorage.removeItem('current_organization');
    localStorage.removeItem('user_organizations');
  }
}

// ===== VALIDATION HELPERS =====

/**
 * Validate login form data
 */
export function validateLoginData(data: Partial<LoginRequest>): string[] {
  const errors: string[] = [];

  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.password) {
    errors.push('Password is required');
  }

  return errors;
}

/**
 * Validate registration form data
 */
export function validateRegisterData(data: Partial<RegisterRequest>): string[] {
  const errors: string[] = [];

  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.username && data.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }

  if (!data.password) {
    errors.push('Password is required');
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (!data.firstName?.trim()) {
    errors.push('First name is required');
  }

  if (!data.lastName?.trim()) {
    errors.push('Last name is required');
  }

  return errors;
}

// ===== ERROR HANDLING =====

export function parseAuthError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

export function isAuthError(error: unknown): boolean {
  const message = parseAuthError(error).toLowerCase();
  return message.includes('unauthorized') || 
         message.includes('not authenticated') ||
         message.includes('invalid token') ||
         message.includes('expired token');
}

// ===== UTILITY FUNCTIONS =====

export function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

export function getUserDisplayName(user: User): string {
  return user.fullName || formatUserName(user);
}

export function userNeedsApproval(user: User): boolean {
  return user.status === 'PENDING';
}

export function isUserActive(user: User): boolean {
  return user.status === 'ACTIVE' && user.isActive;
}

export function getUserInitials(user: User): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}