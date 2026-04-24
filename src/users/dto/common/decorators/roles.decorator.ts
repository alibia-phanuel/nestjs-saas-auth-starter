import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// @Roles('admin') — attache les rôles requis à la route
// Le RolesGuard lit cette métadonnée
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
