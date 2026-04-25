import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

@InputType()
export class SignupInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  password!: string;
}

@InputType()
export class VerifyOtpInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  otp!: string;
}

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  otp!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}

@InputType()
export class RefreshTokenInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
