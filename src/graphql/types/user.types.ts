import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class RoleType {
  @Field()
  name!: string;
}

@ObjectType()
export class UserRoleType {
  @Field(() => RoleType)
  role!: RoleType;
}

@ObjectType()
export class UserType {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field()
  status!: string;

  @Field()
  emailVerified!: boolean;

  @Field()
  twoFactorEnabled!: boolean;

  @Field(() => [UserRoleType], { nullable: true })
  roles?: UserRoleType[];

  @Field()
  createdAt!: Date;
}
