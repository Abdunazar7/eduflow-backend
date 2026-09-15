import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Controller yoki Metodga yozilgan @Roles() ni o'qib olamiz
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Agar endpointda @Roles() ishlatilmagan bo'lsa, demak hammaga ruxsat (Faqat tokeni borlarga)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Request ichidan userni olamiz (AccessTokenGuard yuklab bergan user)
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi tizimga kirmagan');
    }

    if (!user.role) {
      throw new ForbiddenException('Foydalanuvchining roli aniqlanmadi');
    }

    // 3. Superadmin (PLATFORM_ADMIN) huquqi - U xohlagan joyga kira oladi
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // 4. Ruxsatlarni solishtiramiz
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Sizga ushbu amalni bajarish taqiqlanadi. (Talab qilingan rollar: ${requiredRoles.join(', ')})`,
      );
    }

    return true;
  }
}
