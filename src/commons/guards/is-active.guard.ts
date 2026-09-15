import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthUser } from '../types';

/**
 * Defence in depth. AccessTokenStrategy already rejects inactive accounts at
 * authentication time; this keeps the check close to the routes that care.
 */
@Injectable()
export class IsActiveGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as
      | AuthUser
      | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Your account is inactive. Please contact support.',
      );
    }

    return true;
  }
}
