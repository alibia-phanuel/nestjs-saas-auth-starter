/**
 * ============================================================
 * MODULE — GraphqlModule
 * ============================================================
 *
 * Module NestJS qui regroupe tous les resolvers GraphQL
 * et leurs dépendances.
 *
 * 💡 Rappel Module 1 (00:18:09 Creating Module)
 *    Un module regroupe des providers liés et exporte
 *    ce dont les autres modules ont besoin.
 *
 * 💡 Rappel Module 14 (09:05:48 GraphQL Server Setup)
 *    Les resolvers sont déclarés comme providers dans le module.
 *    NestJS les enregistre automatiquement dans Apollo Server.
 *
 * 🔄 Architecture des dépendances :
 *    GraphqlModule importe :
 *      AuthModule      → fournit AuthService pour AuthResolver
 *      UsersModule     → fournit UsersService pour UsersResolver
 *      OrganizationsModule → fournit OrganizationsService pour OrgsResolver
 *
 * 💡 On ne re-déclare pas les services ici — on importe
 *    les modules qui les exportent déjà.
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { AuthResolver } from './resolvers/auth.resolver';
import { UsersResolver } from './resolvers/users.resolver';
import { OrganizationsResolver } from './resolvers/organizations.resolver';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [AuthModule, UsersModule, OrganizationsModule],
  providers: [AuthResolver, UsersResolver, OrganizationsResolver],
})
export class GraphqlModule {}
