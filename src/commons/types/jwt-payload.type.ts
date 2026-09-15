import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: number;
  phone: string;
  role: UserRole;
  tenantId: number;
};

/**
 * What `request.user` actually holds on an authenticated request.
 *
 * The access-token strategy re-reads the user on every request, so `isActive`
 * and `role` here are the live database values, not whatever was true when the
 * token was signed. That is what makes blocking a user take effect immediately.
 */
export type AuthUser = JwtPayload & {
  isActive: boolean;
};
