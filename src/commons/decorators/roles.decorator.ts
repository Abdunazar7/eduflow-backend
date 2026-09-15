import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Nechta rol berilsa ham hammasini massiv (array) qilib qabul qiladi
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
