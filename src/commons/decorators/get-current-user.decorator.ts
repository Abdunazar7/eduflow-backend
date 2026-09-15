import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser, JwtPayloadWithRefreshToken } from '../types';

/** The authenticated user, or one field of it: `@GetCurrentUser('role')`. */
export const GetCurrentUser = createParamDecorator(
  (
    data: keyof JwtPayloadWithRefreshToken | undefined,
    context: ExecutionContext,
  ) => {
    const user = context.switchToHttp().getRequest().user;
    return data ? user?.[data] : user;
  },
);

/** The authenticated user's id. */
export const GetCurrentUserId = createParamDecorator(
  (_: undefined, context: ExecutionContext): number => {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    return Number(user.sub);
  },
);
