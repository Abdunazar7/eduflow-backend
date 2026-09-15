import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class CreateRoleGuard implements CanActivate {
  // PLATFORM_ADMIN ni bu yerga qo'shmaymiz (u bypass qiladi)
  private readonly hierarchy: Record<UserRole, UserRole[]> = {
    [UserRole.MANAGER]: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT],
    [UserRole.ADMIN]: [UserRole.TEACHER, UserRole.STUDENT],
    [UserRole.TEACHER]: [],
    [UserRole.STUDENT]: [],
    [UserRole.PLATFORM_ADMIN]: [], // ishlatilmaydi, lekin TS uchun turibdi
  };

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user?.role) {
      throw new ForbiddenException('User not authenticated');
    }

    const targetRole = body.role as UserRole;
    const targetTenantId = body.tenantId ? Number(body.tenantId) : null;

    if (!targetRole) {
      throw new BadRequestException('Role is required');
    }

    // ⭐ SUPER ADMIN / PLATFORM_ADMIN = FULL ACCESS
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // 1️⃣ Role hierarchy check
    const allowedRoles = this.hierarchy[user.role] || [];

    if (!allowedRoles.includes(targetRole)) {
      throw new ForbiddenException(
        `Sizning rolingiz (${user.role}) ushbu rolni (${targetRole}) yaratishga huquqi yo'q.`,
      );
    }

    // 2️⃣ Tenant isolation
    if (targetTenantId && targetTenantId !== user.tenantId) {
      throw new ForbiddenException(
        "Siz faqat o'z o'quv markazingiz uchun foydalanuvchi yarata olasiz.",
      );
    }

    return true;
  }
}
