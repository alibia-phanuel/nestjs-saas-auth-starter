/**
 * ============================================================
 * RESOLVER — AuthResolver (API GraphQL d'authentification)
 * ============================================================
 *
 * Le Resolver est l'équivalent GraphQL d'un Controller REST.
 * Chaque méthode avec @Query() ou @Mutation() devient un
 * endpoint dans le schéma GraphQL.
 *
 * 💡 Rappel Module 14 (09:20:11 Resolve Queries)
 *    @Query()    → équivalent d'un endpoint GET REST
 *    @Mutation() → équivalent d'un endpoint POST/PATCH/DELETE
 *
 * 💡 Rappel Module 14 (09:25:42 Resolve Mutations)
 *    Les mutations modifient l'état (créent, mettent à jour,
 *    suppriment des données). Les queries ne font que lire.
 *
 * 💡 Rappel Module 15 (09:34:14 Define Schema for Auth)
 *    On réutilise les mêmes services qu'en REST (AuthService).
 *    GraphQL n'est qu'une couche de transport différente —
 *    la logique métier reste dans les services.
 *
 * 📋 Mutations disponibles :
 *    signup()         → inscription + envoi OTP
 *    login()          → connexion email + password
 *    verifyOtp()      → activation compte via OTP
 *    forgotPassword() → envoi OTP réinitialisation
 *    resetPassword()  → nouveau mot de passe
 *    refreshToken()   → renouvellement tokens JWT
 *    setup2FA()       → génération QR code 2FA
 *    enable2FA()      → activation 2FA
 *    disable2FA()     → désactivation 2FA
 *    verify2FA()      → vérification code 2FA au login
 *
 * 📋 Queries disponibles :
 *    me() → profil de l'utilisateur connecté (protégé JWT)
 * ============================================================
 */

import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { AuthResponse, MessageResponse } from '../types/auth.types';
import { UserType } from '../types/user.types';

import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { GqlCurrentUser } from '../../common/decorators/gql-current-user.decorator';

/** Type de l'utilisateur authentifié disponible via @GqlCurrentUser() */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Setup2FAResponse
 *
 * Type de retour pour la configuration du 2FA.
 * Contient le secret et le QR code à scanner.
 */
import { ObjectType, Field } from '@nestjs/graphql';
import {
  SignupInput,
  VerifyOtpInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  Enable2FAInput,
  Verify2FAInput,
} from '../types/auth.inputs';

@ObjectType()
class Setup2FAResponse {
  /** Secret TOTP base32 — à sauvegarder en cas de perte du téléphone */
  @Field()
  secret!: string;

  /** URL otpauth:// — encodée dans le QR code */
  @Field()
  otpauthUrl!: string;

  /** QR code en base64 — à afficher sur le frontend */
  @Field()
  qrCode!: string;
}

/**
 * AuthResolver
 *
 * @Resolver() → déclare ce fichier comme resolver GraphQL
 * Sans argument car ce resolver gère plusieurs types de retour
 * (AuthResponse, MessageResponse, UserType...)
 */
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // ══════════════════════════════════════════════════════════
  // 📌 QUERIES
  // ══════════════════════════════════════════════════════════

  /**
   * me()
   *
   * Retourne le profil de l'utilisateur actuellement connecté.
   * Protégé par GqlAuthGuard — nécessite un JWT valide.
   *
   * 💡 Rappel Module 15 (09:52:47) — même logique que
   *    le endpoint GET /auth/me en REST, mais via GraphQL.
   *
   * Requête GraphQL :
   *    query {
   *      me {
   *        id
   *        email
   *        firstName
   *        roles { role { name } }
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Query(() => UserType, {
    description: 'Get the currently authenticated user profile',
  })
  @UseGuards(GqlAuthGuard)
  me(@GqlCurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 MUTATIONS — Inscription & Vérification
  // ══════════════════════════════════════════════════════════

  /**
   * signup()
   *
   * Inscrit un nouvel utilisateur et envoie un OTP par email.
   *
   * Mutation GraphQL :
   *    mutation {
   *      signup(input: {
   *        email: "user@example.com"
   *        password: "SecurePass123!"
   *        firstName: "Phanuel"
   *      }) {
   *        key
   *        message
   *      }
   *    }
   */
  @Mutation(() => AuthResponse, {
    description: 'Register a new user — sends OTP to email for verification',
  })
  async signup(@Args('input') input: SignupInput): Promise<AuthResponse> {
    const result = await this.authService.signup(input);
    return { key: result.key, message: result.message };
  }

  /**
   * verifyOtp()
   *
   * Active le compte via l'OTP reçu par email après inscription.
   *
   * Mutation GraphQL :
   *    mutation {
   *      verifyOtp(input: {
   *        email: "user@example.com"
   *        otp: "847392"
   *      }) {
   *        key
   *        message
   *      }
   *    }
   */
  @Mutation(() => MessageResponse, {
    description: 'Verify OTP received by email to activate the account',
  })
  async verifyOtp(
    @Args('input') input: VerifyOtpInput,
  ): Promise<MessageResponse> {
    return this.authService.verifyOtp(input);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 MUTATIONS — Connexion
  // ══════════════════════════════════════════════════════════

  /**
   * login()
   *
   * Authentifie l'utilisateur avec email + mot de passe.
   * Si 2FA activé → retourne requiresTwoFactor: true.
   * Sinon → retourne accessToken + refreshToken.
   *
   * Mutation GraphQL :
   *    mutation {
   *      login(input: {
   *        email: "user@example.com"
   *        password: "SecurePass123!"
   *      }) {
   *        key
   *        message
   *        accessToken
   *        refreshToken
   *        requiresTwoFactor
   *        email
   *      }
   *    }
   */
  @Mutation(() => AuthResponse, {
    description:
      'Login with email and password — returns JWT tokens or 2FA prompt',
  })
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    const result = await this.authService.login(input);

    // Cas 2FA requis → pas de tokens
    if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
      return {
        key: result.key,
        message: result.message,
        requiresTwoFactor: true,
        email: result.email,
      };
    }

    // Cas normal → tokens JWT
    return {
      key: result.key,
      message: result.message,
      accessToken: 'accessToken' in result ? result.accessToken : undefined,
      refreshToken: 'refreshToken' in result ? result.refreshToken : undefined,
    };
  }

  /**
   * refreshToken()
   *
   * Renouvelle l'access token via un refresh token valide.
   * L'ancien refresh token est révoqué (rotation des tokens).
   *
   * Mutation GraphQL :
   *    mutation {
   *      refreshToken(input: { refreshToken: "eyJhbGc..." }) {
   *        accessToken
   *        refreshToken
   *      }
   *    }
   */
  @Mutation(() => AuthResponse, {
    description: 'Refresh access token using a valid refresh token',
  })
  async refreshToken(
    @Args('input') input: RefreshTokenInput,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.refreshToken(input.refreshToken);
    return {
      key: 'auth.login_success',
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ══════════════════════════════════════════════════════════
  // 📌 MUTATIONS — Réinitialisation mot de passe
  // ══════════════════════════════════════════════════════════

  /**
   * forgotPassword()
   *
   * Envoie un OTP de réinitialisation par email.
   * Retourne toujours le même message (sécurité anti-énumération).
   *
   * Mutation GraphQL :
   *    mutation {
   *      forgotPassword(input: { email: "user@example.com" }) {
   *        key
   *        message
   *      }
   *    }
   */
  @Mutation(() => MessageResponse, {
    description: 'Send password reset OTP to email',
  })
  async forgotPassword(
    @Args('input') input: ForgotPasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.forgotPassword(input.email);
  }

  /**
   * resetPassword()
   *
   * Réinitialise le mot de passe via l'OTP reçu par email.
   *
   * Mutation GraphQL :
   *    mutation {
   *      resetPassword(input: {
   *        email: "user@example.com"
   *        otp: "123456"
   *        newPassword: "NewSecurePass123!"
   *      }) {
   *        key
   *        message
   *      }
   *    }
   */
  @Mutation(() => MessageResponse, {
    description: 'Reset password using OTP received by email',
  })
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.resetPassword(input);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 MUTATIONS — 2FA (Double Authentification)
  // ══════════════════════════════════════════════════════════

  /**
   * setup2FA()
   *
   * Génère le secret TOTP et le QR code pour configurer
   * Google Authenticator. Nécessite d'être authentifié.
   *
   * Mutation GraphQL :
   *    mutation {
   *      setup2FA {
   *        secret
   *        otpauthUrl
   *        qrCode
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => Setup2FAResponse, {
    description: 'Generate 2FA QR code to scan with Google Authenticator',
  })
  @UseGuards(GqlAuthGuard)
  async setup2FA(
    @GqlCurrentUser() user: AuthenticatedUser,
  ): Promise<Setup2FAResponse> {
    return this.authService.setup2FA(user.id);
  }

  /**
   * enable2FA()
   *
   * Active le 2FA après vérification du premier code TOTP.
   * Nécessite d'avoir scanné le QR code avec setup2FA().
   *
   * Mutation GraphQL :
   *    mutation {
   *      enable2FA(input: { code: "847392" }) {
   *        key
   *        message
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => MessageResponse, {
    description: 'Enable 2FA after scanning QR code — requires valid TOTP code',
  })
  @UseGuards(GqlAuthGuard)
  async enable2FA(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('input') input: Enable2FAInput,
  ): Promise<MessageResponse> {
    return this.authService.enable2FA(user.id, input.code);
  }

  /**
   * disable2FA()
   *
   * Désactive le 2FA après vérification d'un code valide.
   *
   * Mutation GraphQL :
   *    mutation {
   *      disable2FA(input: { code: "847392" }) {
   *        key
   *        message
   *      }
   *    }
   * Header requis : Authorization: Bearer <accessToken>
   */
  @Mutation(() => MessageResponse, {
    description: 'Disable 2FA — requires valid TOTP code for confirmation',
  })
  @UseGuards(GqlAuthGuard)
  async disable2FA(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args('input') input: Enable2FAInput,
  ): Promise<MessageResponse> {
    return this.authService.disable2FA(user.id, input.code);
  }

  /**
   * verify2FA()
   *
   * Vérifie le code 2FA après login et retourne les tokens JWT.
   * Appelé uniquement quand login() retourne requiresTwoFactor: true.
   *
   * Mutation GraphQL :
   *    mutation {
   *      verify2FA(input: {
   *        email: "user@example.com"
   *        code: "847392"
   *      }) {
   *        accessToken
   *        refreshToken
   *      }
   *    }
   */
  @Mutation(() => AuthResponse, {
    description: 'Verify 2FA TOTP code after login — returns JWT tokens',
  })
  async verify2FA(@Args('input') input: Verify2FAInput): Promise<AuthResponse> {
    const result = await this.authService.verify2FA({
      email: input.email,
      code: input.code,
    });
    return {
      key: result.key,
      message: result.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }
}
