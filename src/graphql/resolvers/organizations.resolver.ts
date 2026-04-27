/**
 * ============================================================
 * RESOLVER — OrganizationsResolver (API GraphQL organisations)
 * ============================================================
 *
 * Resolver GraphQL pour la gestion multi-tenancy SaaS.
 * Mirror de OrganizationsController REST.
 *
 * 💡 Rappel Module 3 (01:20:59 One To Many Relation)
 *    Organization → Members → User
 *    Chaque organisation a plusieurs membres avec des rôles.
 *
 * 💡 Rappel Module 20 (13:35:43 Event Emitter)
 *    inviteMember() émet un événement → MailService envoie
 *    l'email d'invitation. Même architecture qu'en REST.
 *
 * 📋 Queries :
 *    myOrganizations()      → organisations de l'utilisateur
 *    organization(id)       → détails d'une organisation
 *
 * 📋 Mutations :
 *    createOrganization()   → crée une organisation
 *    updateOrganization()   → met à jour une organisation
 *    deleteOrganization()   → supprime une organisation
 *    inviteMember()         → invite un membre par email
 *    acceptInvitation()     → accepte une invitation
 *    removeMember()         → retire un membre
 * ============================================================
 */

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrganizationsService } from '../../organizations/organizations.service';
import { OrganizationType } from '../types/organization.types';
import { MessageResponse } from '../types/auth.types';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { GqlCurrentUser } from '../../common/decorators/gql-current-user.decorator';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  InviteMemberInput,
} from '../types/organization.inputs';

/** Type de l'utilisateur authentifié */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * OrganizationsResolver
 *
 * @Resolver(() => OrganizationType) → résout le type OrganizationType.
 */
@Resolver(() => OrganizationType)
export class OrganizationsResolver {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ══════════════════════════════════════════════════════════
  // 📌 QUERIES
  // ══════════════════════════════════════════════════════════

  /**
   * myOrganizations()
   *
   * Retourne toutes les organisations dont l'utilisateur est membre.
   *
   * Requête GraphQL :
   *    query {
   *      myOrganizations {
   *        id
   *        name
   *        slug
   *        planType
   *        members { userId role joinedAt }
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Query(() => [OrganizationType], {
    description: 'Get all organizations where the current user is a member',
  })
  @UseGuards(GqlAuthGuard)
  async myOrganizations(
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationType[]> {
    const memberships = await this.organizationsService.findAllByUser(user.id);
    return memberships.map(
      (m) => m.organization,
    ) as unknown as OrganizationType[];
  }

  /**
   * organization(id)
   *
   * Retourne les détails d'une organisation.
   * L'utilisateur doit être membre de l'organisation.
   *
   * Requête GraphQL :
   *    query {
   *      organization(id: "org-uuid") {
   *        id
   *        name
   *        planType
   *        members { userId role }
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Query(() => OrganizationType, {
    description: 'Get organization details — user must be a member',
  })
  @UseGuards(GqlAuthGuard)
  organization(
    @Args('id', { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): OrganizationType {
    return this.organizationsService.findOne(
      id,
      user.id,
    ) as unknown as OrganizationType;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 MUTATIONS
  // ══════════════════════════════════════════════════════════

  /**
   * createOrganization()
   *
   * Crée une nouvelle organisation.
   * Le créateur devient automatiquement OWNER.
   *
   * Mutation GraphQL :
   *    mutation {
   *      createOrganization(input: {
   *        name: "Acme Corp"
   *        slug: "acme-corp"
   *        planType: FREE
   *      }) {
   *        id
   *        name
   *        slug
   *        planType
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => OrganizationType, {
    description: 'Create a new organization — creator becomes OWNER',
  })
  @UseGuards(GqlAuthGuard)
  createOrganization(
    @Args('input') input: CreateOrganizationInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): OrganizationType {
    return this.organizationsService.create(
      user.id,
      input,
    ) as unknown as OrganizationType;
  }

  /**
   * updateOrganization()
   *
   * Met à jour une organisation.
   * Réservé aux OWNER et ADMIN de l'organisation.
   *
   * Mutation GraphQL :
   *    mutation {
   *      updateOrganization(
   *        id: "org-uuid"
   *        input: { name: "Acme Corp Updated" planType: PRO }
   *      ) {
   *        id
   *        name
   *        planType
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => OrganizationType, {
    description: 'Update organization — owner/admin only',
  })
  @UseGuards(GqlAuthGuard)
  updateOrganization(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateOrganizationInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): OrganizationType {
    return this.organizationsService.update(
      id,
      user.id,
      input,
    ) as unknown as OrganizationType;
  }

  /**
   * deleteOrganization()
   *
   * Supprime une organisation et tous ses membres.
   * Réservé au OWNER uniquement.
   *
   * Mutation GraphQL :
   *    mutation {
   *      deleteOrganization(id: "org-uuid") {
   *        key
   *        message
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => MessageResponse, {
    description: 'Delete organization — owner only',
  })
  @UseGuards(GqlAuthGuard)
  async deleteOrganization(
    @Args('id', { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return this.organizationsService.remove(id, user.id);
  }

  /**
   * inviteMember()
   *
   * Invite un membre dans l'organisation par email.
   * Un email d'invitation est envoyé automatiquement.
   * Réservé aux OWNER et ADMIN.
   *
   * Mutation GraphQL :
   *    mutation {
   *      inviteMember(
   *        orgId: "org-uuid"
   *        input: { email: "colleague@example.com" role: MEMBER }
   *      ) {
   *        key
   *        message
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => MessageResponse, {
    description: 'Invite a member by email — owner/admin only',
  })
  @UseGuards(GqlAuthGuard)
  async inviteMember(
    @Args('orgId', { type: () => ID }) orgId: string,
    @Args('input') input: InviteMemberInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return this.organizationsService.inviteMember(orgId, user.id, input);
  }

  /**
   * acceptInvitation()
   *
   * Accepte une invitation à rejoindre une organisation.
   * Le token d'invitation est reçu par email.
   *
   * Mutation GraphQL :
   *    mutation {
   *      acceptInvitation(token: "abc123...") {
   *        key
   *        message
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => MessageResponse, {
    description: 'Accept an organization invitation using the token from email',
  })
  @UseGuards(GqlAuthGuard)
  async acceptInvitation(
    @Args('token') token: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return this.organizationsService.acceptInvitation(token, user.id);
  }

  /**
   * removeMember()
   *
   * Retire un membre d'une organisation.
   * Réservé aux OWNER et ADMIN.
   *
   * Mutation GraphQL :
   *    mutation {
   *      removeMember(
   *        orgId: "org-uuid"
   *        userId: "user-uuid"
   *      ) {
   *        key
   *        message
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => MessageResponse, {
    description: 'Remove a member from organization — owner/admin only',
  })
  @UseGuards(GqlAuthGuard)
  async removeMember(
    @Args('orgId', { type: () => ID }) orgId: string,
    @Args('userId', { type: () => ID }) userId: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return this.organizationsService.removeMember(orgId, user.id, userId);
  }
}
