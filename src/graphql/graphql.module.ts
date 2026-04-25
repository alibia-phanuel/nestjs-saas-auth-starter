import { Module } from '@nestjs/common';
import { AuthResolver } from './resolvers/auth.resolver';
import { UsersResolver } from './resolvers/users.resolver';
import { OrganizationsResolver } from './resolvers/organizations.resolver';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

// Rappel Module 14 — Le GraphQL Module regroupe
// tous les resolvers et leurs dépendances
@Module({
  imports: [AuthModule, UsersModule, OrganizationsModule],
  providers: [AuthResolver, UsersResolver, OrganizationsResolver],
})
export class GraphqlModule {}
