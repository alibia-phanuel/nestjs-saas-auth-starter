import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { PlanType, MemberRole } from '../../generated/prisma';

// Enregistre les enums Prisma pour GraphQL
registerEnumType(PlanType, { name: 'PlanType' });
registerEnumType(MemberRole, { name: 'MemberRole' });

@ObjectType()
export class OrganizationMemberType {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field(() => MemberRole)
  role!: MemberRole;

  @Field()
  joinedAt!: Date;
}

@ObjectType()
export class OrganizationType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => PlanType)
  planType!: PlanType;

  @Field(() => [OrganizationMemberType], { nullable: true })
  members?: OrganizationMemberType[];

  @Field()
  createdAt!: Date;
}
