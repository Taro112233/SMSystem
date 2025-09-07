// lib/auth-server.ts - FIXED VERSION
// InvenStock - Server-side User Verification Utilities (Next.js 15 Compatible)

import { cookies } from 'next/headers';
import { verifyToken, JWTUser } from './auth';
import { prisma } from './prisma';

/**
 * Get current user from server-side (for API routes and server components)
 */
export async function getServerUser(): Promise<JWTUser | null> {
  try {
    // Get token from cookies (Next.js 15 - cookies() is now async)
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    // Verify JWT token
    const payload = await verifyToken(token);

    if (!payload || !payload.userId) {
      return null;
    }

    // Verify user still exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        status: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive || user.status !== 'ACTIVE') {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      username: user.username || undefined, // Convert null to undefined
      firstName: user.firstName,
      lastName: user.lastName,
    };
  } catch (error) {
    console.error('Server user verification failed:', error);
    return null;
  }
}

/**
 * Get user ID from server-side (quick version)
 */
export async function getServerUserId(): Promise<string | null> {
  const user = await getServerUser();
  return user?.userId || null;
}

/**
 * Check if user is authenticated on server-side
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const user = await getServerUser();
  return user !== null;
}

/**
 * Get user from request headers (for API routes with middleware)
 */
export function getUserFromHeaders(headers: Headers): {
  userId: string;
  email: string;
} | null {
  const userId = headers.get('x-user-id');
  const email = headers.get('x-user-email');

  if (!userId || !email) {
    return null;
  }

  return { userId, email };
}

/**
 * Require authentication on server-side (throws if not authenticated)
 */
export async function requireServerAuth(): Promise<JWTUser> {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Get user with organization context
 */
export async function getServerUserWithOrganization(organizationId?: string): Promise<{
  user: JWTUser;
  organization: any;
  role: any;
} | null> {
  const user = await getServerUser();
  
  if (!user) {
    return null;
  }

  // If no organizationId provided, try to get from JWT
  let targetOrgId = organizationId || user.organizationId;

  if (!targetOrgId) {
    return { user, organization: null, role: null };
  }

  try {
    // Get user's organization membership with role
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        userId: user.userId,
        organizationId: targetOrgId,
        isActive: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            timezone: true,
            currency: true,
          },
        },
      },
    });

    if (!orgUser) {
      return null;
    }

    // Get user's role in this organization
    const userRole = await prisma.organizationUserRole.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: user.userId,
        },
        isActive: true,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return {
      user,
      organization: orgUser.organization,
      role: userRole?.role || null,
    };
  } catch (error) {
    console.error('Failed to get user organization context:', error);
    return { user, organization: null, role: null };
  }
}

/**
 * Check if user has permission in current organization
 */
export async function hasPermission(
  permission: string,
  organizationId?: string
): Promise<boolean> {
  const context = await getServerUserWithOrganization(organizationId);
  
  if (!context || !context.role) {
    return false;
  }

  // Check if user has the specific permission
  const hasDirectPermission = context.role.permissions.some(
    (rolePermission: any) => 
      rolePermission.permission.name === permission && rolePermission.allowed
  );

  if (hasDirectPermission) {
    return true;
  }

  // Check wildcard permissions
  const [category] = permission.split('.');
  const wildcardPermission = `${category}.*`;
  
  const hasWildcardPermission = context.role.permissions.some(
    (rolePermission: any) => 
      rolePermission.permission.name === wildcardPermission && rolePermission.allowed
  );

  if (hasWildcardPermission) {
    return true;
  }

  // Check super admin permission
  const hasSuperAdminPermission = context.role.permissions.some(
    (rolePermission: any) => 
      rolePermission.permission.name === '*' && rolePermission.allowed
  );

  return hasSuperAdminPermission;
}

/**
 * Require specific permission (throws if not authorized)
 */
export async function requirePermission(
  permission: string,
  organizationId?: string
): Promise<void> {
  const hasAccess = await hasPermission(permission, organizationId);
  
  if (!hasAccess) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Get organization from server context
 */
export async function getServerOrganization(organizationId: string): Promise<any> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        status: true,
        timezone: true,
        currency: true,
        allowDepartments: true,
        allowCustomRoles: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return organization;
  } catch (error) {
    console.error('Failed to get organization:', error);
    return null;
  }
}

/**
 * Validate organization access for user
 */
export async function validateOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        userId,
        organizationId,
        isActive: true,
      },
    });

    return orgUser !== null;
  } catch (error) {
    console.error('Failed to validate organization access:', error);
    return false;
  }
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations(userId: string): Promise<any[]> {
  try {
    const organizations = await prisma.organizationUser.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
            status: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return organizations;
  } catch (error) {
    console.error('Failed to get user organizations:', error);
    return [];
  }
}