import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}
