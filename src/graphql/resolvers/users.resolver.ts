import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UserType } from '../types/user.types';
import { MessageResponse } from '../types/auth.types';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { GqlCurrentUser } from '../../common/decorators/gql-current-user.decorator';
import { UpdateUserInput } from '../types/user.inputs';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // query { users { id email firstName roles { role { name } } } }
  @Query(() => [UserType])
  @UseGuards(GqlAuthGuard)
  users(): UserType[] {
    return this.usersService.findAll() as unknown as UserType[];
  }

  // query { user(id: "uuid") { id email firstName } }
  @Query(() => UserType)
  @UseGuards(GqlAuthGuard)
  user(@Args('id', { type: () => ID }) id: string): UserType {
    return this.usersService.findOne(id) as unknown as UserType;
  }

  // mutation { updateUser(id: "uuid", input: {...}) { id email firstName } }
  @Mutation(() => UserType)
  @UseGuards(GqlAuthGuard)
  updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserInput,
    @GqlCurrentUser() currentUser: AuthenticatedUser,
  ): UserType {
    return this.usersService.update(
      id,
      currentUser.id,
      input,
    ) as unknown as UserType;
  }

  // mutation { deleteUser(id: "uuid") { key message } }
  @Mutation(() => MessageResponse)
  @UseGuards(GqlAuthGuard)
  async deleteUser(
    @Args('id', { type: () => ID }) id: string,
    @GqlCurrentUser() currentUser: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return this.usersService.remove(id, currentUser.id);
  }
}
