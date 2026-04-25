import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrganizationsService } from '../../organizations/organizations.service';
import { OrganizationType } from '../types/organization.types';
import { MessageResponse } from '../types/auth.types';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { GqlCurrentUser } from '../../common/decorators/gql-current-user.decorator';
import {
  CreateOrganizationInput,
  InviteMemberInput,
} from '../types/organization.inputs';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Resolver(() => OrganizationType)
export class OrganizationsResolver {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // mutation { createOrganization(input: {...}) { id name slug } }
  @Mutation(() => OrganizationType)
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

  // query { myOrganizations { organization { id name } role } }
  @Query(() => [OrganizationType])
  @UseGuards(GqlAuthGuard)
  async myOrganizations(
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationType[]> {
    const memberships = await this.organizationsService.findAllByUser(user.id);
    return memberships.map(
      (m) => m.organization,
    ) as unknown as OrganizationType[];
  }

  // query { organization(id: "uuid") { id name members { userId role } } }
  @Query(() => OrganizationType)
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

  // mutation { inviteMember(orgId: "uuid", input: {...}) { key message } }
  @Mutation(() => MessageResponse)
  @UseGuards(GqlAuthGuard)
  async inviteMember(
    @Args('orgId', { type: () => ID }) orgId: string,
    @Args('input') input: InviteMemberInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return this.organizationsService.inviteMember(orgId, user.id, input);
  }

  // mutation { acceptInvitation(token: "...") { key message } }
  @Mutation(() => MessageResponse)
  @UseGuards(GqlAuthGuard)
  async acceptInvitation(
    @Args('token') token: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return this.organizationsService.acceptInvitation(token, user.id);
  }
}
