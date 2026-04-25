import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PlanType, MemberRole } from '../../generated/prisma';

@InputType()
export class CreateOrganizationInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  slug!: string;

  @Field(() => PlanType, { nullable: true })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;
}

@InputType()
export class InviteMemberInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field(() => MemberRole, { nullable: true })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}
