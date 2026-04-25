import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { AuthResponse, MessageResponse } from '../types/auth.types';
import { UserType } from '../types/user.types';

import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { GqlCurrentUser } from '../../common/decorators/gql-current-user.decorator';
import {
  ForgotPasswordInput,
  LoginInput,
  RefreshTokenInput,
  ResetPasswordInput,
  SignupInput,
  VerifyOtpInput,
} from '../types/auth.inputs';

interface AuthenticatedUser {
  id: string;
  email: string;
}

// ── Rappel Module 14 (09:20:11) ──────────────────────
// @Resolver() — déclare ce fichier comme resolver GraphQL
// Chaque méthode avec @Query() ou @Mutation() devient
// un endpoint dans le schema GraphQL

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // ── MUTATIONS ─────────────────────────────────────

  // mutation { signup(input: {...}) { key message user { id email } } }
  @Mutation(() => AuthResponse)
  async signup(@Args('input') input: SignupInput): Promise<AuthResponse> {
    const result = await this.authService.signup(input);
    return {
      key: result.key,
      message: result.message,
    };
  }

  // mutation { login(input: {...}) { key message accessToken refreshToken } }
  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    const result = await this.authService.login(input);

    if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
      return {
        key: result.key,
        message: result.message,
        requiresTwoFactor: true,
        email: result.email,
      };
    }

    return {
      key: result.key,
      message: result.message,
      accessToken: 'accessToken' in result ? result.accessToken : undefined,
      refreshToken: 'refreshToken' in result ? result.refreshToken : undefined,
    };
  }

  // mutation { verifyOtp(input: {...}) { key message } }
  @Mutation(() => MessageResponse)
  async verifyOtp(
    @Args('input') input: VerifyOtpInput,
  ): Promise<MessageResponse> {
    return this.authService.verifyOtp(input);
  }

  // mutation { forgotPassword(input: {...}) { key message } }
  @Mutation(() => MessageResponse)
  async forgotPassword(
    @Args('input') input: ForgotPasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.forgotPassword(input.email);
  }

  // mutation { resetPassword(input: {...}) { key message } }
  @Mutation(() => MessageResponse)
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.resetPassword(input);
  }

  // mutation { refreshToken(input: {...}) { accessToken refreshToken } }
  @Mutation(() => AuthResponse)
  async refreshToken(
    @Args('input') input: RefreshTokenInput,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.refreshToken(input.refreshToken);
    return {
      key: 'auth.login_success',
      message: 'Token refreshed',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ── QUERIES ───────────────────────────────────────

  // query { me { id email firstName roles { role { name } } } }
  @Query(() => UserType)
  @UseGuards(GqlAuthGuard)
  me(@GqlCurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
