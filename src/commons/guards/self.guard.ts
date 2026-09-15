import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../types';

/** Allows a request only when the :id route param is the caller's own id. */
@Injectable()
export class SelfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user || !request.params?.id) {
      return false;
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // The JWT carries the user id as `sub`, not `id`.
    if (user.sub !== Number(request.params.id)) {
      throw new ForbiddenException('Not your account, access denied');
    }

    return true;
  }
}
