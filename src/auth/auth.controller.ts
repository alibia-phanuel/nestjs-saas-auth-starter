/**
 * ============================================================
 * CONTRÔLEUR — AuthController (Authentification principale)
 * ============================================================
 *
 * Ce fichier définit le contrôleur principal d'authentification.
 * Il expose tous les endpoints liés à l'auth : inscription,
 * connexion, 2FA, OAuth Google, gestion des tokens...
 *
 * 💡 Rappel : le contrôleur ne contient PAS de logique métier.
 *    Il reçoit les requêtes, les délègue aux services
 *    (AuthService, OAuthService) et retourne les réponses.
 *
 * 🚦 Rate Limiting — Protection contre les attaques :
 *    ─────────────────────────────────────────────────────
 *    @Throttle({ auth: { limit: 5, ttl: 60_000 } })
 *    → max 5 tentatives par minute par IP
 *    → protège contre le brute force sur login/signup
 *
 *    @Throttle({ email: { limit: 3, ttl: 60_000 } })
 *    → max 3 tentatives par minute par IP
 *    → protège contre le spam d'emails OTP
 *
 *    Ces throttles sont définis dans throttlerConfig et
 *    s'ajoutent au ThrottlerGuard global (100 req/min).
 *    ─────────────────────────────────────────────────────
 *
 * 📋 Endpoints exposés :
 *    ─────────────────────────────────────────────────────
 *    POST /auth/signup            → Inscription (email: 3/min)
 *    POST /auth/verify-otp        → Vérification OTP (auth: 10/min)
 *    POST /auth/login             → Connexion classique (auth: 5/min)
 *    POST /auth/refresh           → Renouvellement des tokens
 *    POST /auth/forgot-password   → Demande réinitialisation (email: 3/min)
 *    POST /auth/reset-password    → Nouveau mot de passe (auth: 5/min)
 *    GET  /auth/me                → Profil utilisateur connecté
 *    POST /auth/2fa/setup         → Configurer le 2FA
 *    POST /auth/2fa/enable        → Activer le 2FA (auth: 5/min)
 *    POST /auth/2fa/disable       → Désactiver le 2FA (auth: 5/min)
 *    POST /auth/2fa/verify        → Vérifier le code 2FA (auth: 5/min)
 *    GET  /auth/google            → Lancer l'auth Google
 *    GET  /auth/google/callback   → Callback Google OAuth
 *    ─────────────────────────────────────────────────────
 *
 * 🔧 Services injectés :
 *    - AuthService  → logique d'authentification classique + 2FA
 *    - OAuthService → logique d'authentification OAuth Google
 * ============================================================
 */

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { OAuthService } from './oauth.service';
import type {
  GoogleUser,
  JwtPayload,
  AuthTokens,
  MessageResponse,
  Setup2FAResult,
} from './types/auth.types';
import type { Response } from 'express';

/**
 * @ApiTags('Auth')
 * Regroupe tous les endpoints sous la section "Auth"
 * dans la documentation Swagger (/api/docs).
 *
 * @Controller('auth')
 * Préfixe toutes les routes avec /auth.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  /**
   * AuthService et OAuthService sont injectés automatiquement
   * par NestJS via le constructeur (injection de dépendances).
   */
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/signup — Inscription
  // ══════════════════════════════════════════════════════════

  /**
   * signup()
   *
   * Inscrit un nouvel utilisateur et envoie un OTP par email
   * pour vérifier son adresse. Le compte est créé avec le
   * statut PENDING jusqu'à la vérification de l'OTP.
   *
   * 🚦 Rate Limiting : 3 requêtes / minute / IP
   *    Raison : éviter le spam de créations de comptes
   *    et l'envoi massif d'emails OTP depuis la même IP.
   *    Au-delà → 429 Too Many Requests.
   *
   * @HttpCode(201) → retourne 201 Created (pas 200 par défaut)
   * @param dto → SignupDto contenant email, password, prénom, nom
   * @returns   → MessageResponse confirmant l'envoi de l'OTP
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ email: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Inscription — envoie un OTP par email',
    description: `
Crée un nouveau compte utilisateur.
Un OTP à 6 chiffres est envoyé par email pour vérifier l'adresse.
Le compte reste PENDING jusqu'à la vérification via /auth/verify-otp.

**Rate Limiting** : 3 requêtes / minute / IP
    `,
  })
  @ApiResponse({ status: 201, description: 'OTP envoyé par email' })
  @ApiResponse({
    status: 409,
    description: 'Un compte avec cet email existe déjà',
  })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async signup(@Body() dto: SignupDto): Promise<MessageResponse> {
    return this.authService.signup(dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/verify-otp — Vérification OTP
  // ══════════════════════════════════════════════════════════

  /**
   * verifyOtp()
   *
   * Vérifie le code OTP reçu par email après l'inscription.
   * Si valide, le compte passe de PENDING à ACTIVE et
   * emailVerified passe à true. L'OTP est effacé après usage.
   *
   * 🚦 Rate Limiting : 10 requêtes / minute / IP
   *    Raison : limiter les tentatives de brute force sur
   *    les codes OTP à 6 chiffres (1 million de combinaisons).
   *    Avec 10 tentatives/min, il faudrait 1M/10 = 100K minutes
   *    pour tester tous les codes. OTP expiré après 15 min.
   *
   * @param dto → VerifyOtpDto contenant email + code OTP à 6 chiffres
   * @returns   → MessageResponse confirmant l'activation du compte
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Vérifier l'OTP pour activer le compte",
    description: `
Vérifie le code OTP reçu par email et active le compte.
L'OTP est valide 15 minutes et usage unique.

**Rate Limiting** : 10 requêtes / minute / IP
    `,
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'Compte activé avec succès' })
  @ApiResponse({ status: 401, description: 'OTP invalide ou expiré' })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<MessageResponse> {
    return this.authService.verifyOtp(dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/login — Connexion classique
  // ══════════════════════════════════════════════════════════

  /**
   * login()
   *
   * Authentifie un utilisateur avec email + mot de passe.
   * Retourne les tokens JWT si les identifiants sont corrects
   * et le compte est actif.
   *
   * 💡 Si le 2FA est activé sur le compte, la réponse ne
   *    contient pas de tokens mais un indicateur demandant
   *    le code Google Authenticator (requiresTwoFactor: true).
   *    L'utilisateur doit alors appeler POST /auth/2fa/verify.
   *
   * 🚦 Rate Limiting : 5 requêtes / minute / IP
   *    Raison : protection principale contre le brute force.
   *    C'est l'endpoint le plus critique — un attaquant qui
   *    essaie des combinaisons email/password sera bloqué
   *    après 5 tentatives infructueuses par minute.
   *
   * @param dto → LoginDto contenant email + password
   * @returns   → AuthTokens (accessToken + refreshToken)
   *              ou { requiresTwoFactor: true } si 2FA activé
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Se connecter avec email et mot de passe',
    description: `
Authentifie l'utilisateur et retourne les tokens JWT.

Si le 2FA est activé → retourne \`{ requiresTwoFactor: true, email }\`
Le frontend doit alors appeler \`POST /auth/2fa/verify\` avec le code Google Authenticator.

**Rate Limiting** : 5 requêtes / minute / IP (protection brute force)
    `,
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Retourne les tokens JWT',
    schema: {
      example: {
        key: 'auth.login_success',
        message: 'Login successful',
        accessToken: 'eyJhbGc...',
        refreshToken: 'eyJhbGc...',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '2FA requis',
    schema: {
      example: {
        key: 'auth.2fa_required',
        message: 'Two-factor authentication code required',
        requiresTwoFactor: true,
        email: 'user@example.com',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async login(@Body() dto: LoginDto): Promise<AuthTokens | MessageResponse> {
    return this.authService.login(dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/refresh — Renouvellement des tokens
  // ══════════════════════════════════════════════════════════

  /**
   * refresh()
   *
   * Génère un nouvel accessToken (et un nouveau refreshToken)
   * à partir d'un refreshToken valide. L'ancien refreshToken
   * est révoqué après utilisation (rotation des tokens).
   *
   * 💡 Quand appeler cet endpoint ?
   *    Quand une requête retourne 401 Unauthorized, le client
   *    doit appeler cet endpoint pour obtenir un nouvel
   *    accessToken avant de relancer sa requête originale.
   *
   * 💡 Pas de rate limiting strict ici car :
   *    - Le refreshToken est un secret long et aléatoire
   *    - Il est révoqué après usage (rotation)
   *    - Un attaquant sans refreshToken valide ne peut rien faire
   *    Le throttle global (100/min) est suffisant.
   *
   * @param dto → RefreshTokenDto contenant le refreshToken
   * @returns   → AuthTokens avec de nouveaux tokens
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rafraîchir l'access token",
    description: `
Génère un nouvel accessToken à partir d'un refreshToken valide.
L'ancien refreshToken est révoqué (rotation des tokens — sécurité).

**Rate Limiting** : 100 requêtes / minute / IP (throttle global)
    `,
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Nouveaux tokens retournés',
    schema: {
      example: {
        accessToken: 'eyJhbGc...(nouveau)',
        refreshToken: 'eyJhbGc...(nouveau)',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalide, révoqué ou expiré',
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/forgot-password — Demande de réinitialisation
  // ══════════════════════════════════════════════════════════

  /**
   * forgotPassword()
   *
   * Envoie un OTP par email pour réinitialiser le mot de passe.
   *
   * 🛡️ Sécurité : retourne toujours la même réponse que
   *    l'email existe ou non (protection contre l'énumération).
   *    Un attaquant ne peut pas savoir quels emails sont
   *    enregistrés en testant différentes adresses.
   *
   * 🚦 Rate Limiting : 3 requêtes / minute / IP
   *    Raison : c'est l'endpoint le plus susceptible d'être
   *    utilisé pour spammer des emails. 3 tentatives/min
   *    permet l'usage légitime tout en bloquant le spam.
   *
   * @param dto → ForgotPasswordDto contenant l'email
   * @returns   → MessageResponse (même réponse dans tous les cas)
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ email: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Demander une réinitialisation — envoie un OTP par email',
    description: `
Envoie un OTP de réinitialisation à l'email fourni.

**Sécurité** : retourne toujours la même réponse que l'email existe ou non
(protection contre l'énumération d'emails).

**Rate Limiting** : 3 requêtes / minute / IP (protection anti-spam emails)
    `,
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: "OTP envoyé si l'email existe",
    schema: {
      example: {
        key: 'auth.password_reset_sent',
        message: 'Password reset code sent to your email',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponse> {
    return this.authService.forgotPassword(dto.email);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/reset-password — Nouveau mot de passe
  // ══════════════════════════════════════════════════════════

  /**
   * resetPassword()
   *
   * Définit un nouveau mot de passe après vérification de l'OTP.
   * L'OTP est effacé après usage (usage unique).
   *
   * 🚦 Rate Limiting : 5 requêtes / minute / IP
   *    Raison : limiter les tentatives de brute force sur l'OTP
   *    de réinitialisation. Combiné avec l'expiration 15 min
   *    de l'OTP, cela rend le brute force pratiquement impossible.
   *
   * @param dto → ResetPasswordDto contenant email + OTP + newPassword
   * @returns   → MessageResponse confirmant la réinitialisation
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Réinitialiser le mot de passe avec l'OTP",
    description: `
Définit un nouveau mot de passe après vérification de l'OTP reçu par email.
L'OTP est à usage unique — il est effacé après utilisation.

**Rate Limiting** : 5 requêtes / minute / IP
    `,
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès',
    schema: {
      example: {
        key: 'auth.password_reset_success',
        message: 'Password reset successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'OTP invalide ou expiré' })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    return this.authService.resetPassword({
      email: dto.email,
      otp: dto.otp,
      newPassword: dto.newPassword,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /auth/me — Profil de l'utilisateur connecté
  // ══════════════════════════════════════════════════════════

  /**
   * getMe()
   *
   * Retourne les informations de l'utilisateur actuellement
   * connecté, extraites directement du token JWT via
   * @CurrentUser() — sans requête en base de données.
   *
   * 💡 Pas de rate limiting strict — cet endpoint est en
   *    lecture seule et ne peut être appelé que par un
   *    utilisateur avec un token JWT valide. Le throttle
   *    global (100/min) est suffisant.
   *
   * @UseGuards(JwtAuthGuard) → token JWT obligatoire
   * @ApiBearerAuth()         → documente l'auth JWT dans Swagger
   *
   * @param user → utilisateur extrait du token JWT par JwtStrategy
   * @returns    → JwtPayload contenant { sub, email }
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: "Récupérer l'utilisateur actuellement connecté",
    description: `
Retourne le profil de l'utilisateur connecté depuis le token JWT.
Aucune requête en base de données — données extraites du token.

**Authentification requise** : Bearer Token JWT
**Rate Limiting** : 100 requêtes / minute / IP (throttle global)
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Données de l'utilisateur courant",
    schema: {
      example: {
        sub: 'uuid-123',
        email: 'user@example.com',
        iat: 1714000000,
        exp: 1714000900,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé — token manquant ou invalide',
  })
  getMe(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/2fa/setup — Configurer le 2FA
  // ══════════════════════════════════════════════════════════

  /**
   * setup2FA()
   *
   * Génère un secret TOTP et un QR code à scanner avec
   * Google Authenticator. Le 2FA n'est pas encore activé —
   * l'utilisateur doit confirmer avec enable2FA().
   *
   * 🔄 Étapes du setup 2FA :
   *    1. Appeler ce endpoint → recevoir QR code + secret
   *    2. Scanner le QR code avec Google Authenticator
   *    3. Appeler POST /auth/2fa/enable avec le code généré
   *
   * 💡 Pas de rate limiting strict — nécessite un JWT valide.
   *    Un utilisateur authentifié peut configurer son 2FA
   *    autant de fois que nécessaire.
   *
   * @param user → utilisateur connecté (on a besoin de son id)
   * @returns    → Setup2FAResult contenant secret + otpauthUrl + qrCode
   */
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Générer un QR code pour Google Authenticator',
    description: `
Génère un secret TOTP et un QR code à scanner avec Google Authenticator.
Le 2FA n'est pas encore actif — confirmer avec POST /auth/2fa/enable.

**Étapes** :
1. Appeler cet endpoint → recevoir QR code
2. Scanner avec Google Authenticator
3. Appeler /auth/2fa/enable avec le code généré

**Authentification requise** : Bearer Token JWT
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'QR code et secret générés',
    schema: {
      example: {
        secret: 'JBSWY3DPEHPK3PXP...',
        otpauthUrl: 'otpauth://totp/nestjs-saas-starter:user@example.com?...',
        qrCode: 'data:image/png;base64,...',
      },
    },
  })
  async setup2FA(@CurrentUser() user: { id: string }): Promise<Setup2FAResult> {
    return this.authService.setup2FA(user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/2fa/enable — Activer le 2FA
  // ══════════════════════════════════════════════════════════

  /**
   * enable2FA()
   *
   * Active le 2FA en vérifiant que l'utilisateur a bien
   * scanné le QR code et que son application génère
   * des codes valides. Après activation, chaque connexion
   * demandera un code Google Authenticator.
   *
   * 🚦 Rate Limiting : 5 requêtes / minute / IP
   *    Raison : limiter les tentatives de brute force sur
   *    le code de confirmation lors de l'activation.
   *
   * @param user → utilisateur connecté (on a besoin de son id)
   * @param dto  → Enable2faDto contenant le code à 6 chiffres
   * @returns    → MessageResponse confirmant l'activation
   */
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Activer le 2FA après avoir scanné le QR code',
    description: `
Active l'authentification à deux facteurs sur le compte.
Nécessite un code TOTP valide généré par Google Authenticator.

**Rate Limiting** : 5 requêtes / minute / IP
**Authentification requise** : Bearer Token JWT
    `,
  })
  @ApiBody({ type: Enable2faDto })
  @ApiResponse({
    status: 200,
    description: '2FA activé avec succès',
    schema: {
      example: {
        key: 'auth.2fa_enabled',
        message: 'Two-factor authentication enabled',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Code TOTP invalide' })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async enable2FA(
    @CurrentUser() user: { id: string },
    @Body() dto: Enable2faDto,
  ): Promise<MessageResponse> {
    return this.authService.enable2FA(user.id, dto.code);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/2fa/disable — Désactiver le 2FA
  // ══════════════════════════════════════════════════════════

  /**
   * disable2FA()
   *
   * Désactive le 2FA sur le compte. L'utilisateur doit fournir
   * un code valide pour confirmer la désactivation — on ne peut
   * pas désactiver le 2FA sans vérification (sécurité).
   *
   * 💡 Même DTO qu'enable2FA (Enable2faDto) car les deux
   *    opérations nécessitent uniquement un code à 6 chiffres.
   *
   * 🚦 Rate Limiting : 5 requêtes / minute / IP
   *    Raison : empêcher un attaquant ayant accès au compte
   *    de désactiver le 2FA par brute force.
   *
   * @param user → utilisateur connecté (on a besoin de son id)
   * @param dto  → Enable2faDto contenant le code à 6 chiffres
   * @returns    → MessageResponse confirmant la désactivation
   */
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Désactiver le 2FA',
    description: `
Désactive l'authentification à deux facteurs.
Un code TOTP valide est requis pour confirmer la désactivation.

**Rate Limiting** : 5 requêtes / minute / IP
**Authentification requise** : Bearer Token JWT
    `,
  })
  @ApiBody({ type: Enable2faDto })
  @ApiResponse({
    status: 200,
    description: '2FA désactivé avec succès',
    schema: {
      example: {
        key: 'auth.2fa_disabled',
        message: 'Two-factor authentication disabled',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Code TOTP invalide' })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async disable2FA(
    @CurrentUser() user: { id: string },
    @Body() dto: Enable2faDto,
  ): Promise<MessageResponse> {
    return this.authService.disable2FA(user.id, dto.code);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/2fa/verify — Vérifier le code 2FA
  // ══════════════════════════════════════════════════════════

  /**
   * verify2FA()
   *
   * Appelé après login() quand requiresTwoFactor: true.
   * Vérifie le code Google Authenticator et retourne les
   * tokens JWT si le code est valide.
   *
   * 💡 Cet endpoint ne nécessite pas de JwtAuthGuard car
   *    l'utilisateur n'est pas encore connecté (pas de token).
   *    L'identité est vérifiée via l'email + le code 2FA.
   *
   * 🚦 Rate Limiting : 5 requêtes / minute / IP
   *    Raison : protection critique — sans rate limiting,
   *    un attaquant ayant un email valide pourrait brute force
   *    le code TOTP à 6 chiffres (1M de combinaisons).
   *    Les codes TOTP changent toutes les 30 secondes,
   *    mais 5 tentatives/30s = protection renforcée.
   *
   * @param dto → Verify2faDto contenant email + code 2FA
   * @returns   → AuthTokens (accessToken + refreshToken)
   */
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Vérifier le code 2FA après la connexion',
    description: `
Appelé après \`POST /auth/login\` quand \`requiresTwoFactor: true\`.
Vérifie le code Google Authenticator et retourne les tokens JWT.

**Flux** :
1. \`POST /auth/login\` → \`{ requiresTwoFactor: true, email }\`
2. \`POST /auth/2fa/verify\` avec le code → tokens JWT

**Rate Limiting** : 5 requêtes / minute / IP (protection brute force TOTP)
    `,
  })
  @ApiBody({ type: Verify2faDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens JWT retournés',
    schema: {
      example: {
        key: 'auth.login_success',
        message: 'Login successful',
        accessToken: 'eyJhbGc...',
        refreshToken: 'eyJhbGc...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Code 2FA invalide' })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes — attendez 1 minute',
  })
  async verify2FA(@Body() dto: Verify2faDto): Promise<AuthTokens> {
    return this.authService.verify2FA(dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /auth/google — Lancer l'authentification Google
  // ══════════════════════════════════════════════════════════

  /**
   * googleAuth()
   *
   * Déclenche la redirection vers la page de connexion Google.
   * GoogleAuthGuard gère automatiquement la redirection via
   * passport-google-oauth20 — il n'y a rien à implémenter ici.
   *
   * 💡 Cette méthode est intentionnellement vide.
   *    Passport intercepte la requête avant même d'atteindre
   *    le corps de la méthode et redirige vers Google.
   *
   * 💡 Pas de rate limiting — Google gère sa propre protection
   *    contre les abus sur son infrastructure OAuth.
   *
   * @returns void — Passport gère la redirection (302)
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Se connecter avec Google — redirige vers Google OAuth',
    description: `
Redirige l'utilisateur vers la page de connexion Google.
Après authentification, Google rappelle \`GET /auth/google/callback\`.

**Flow OAuth** :
1. Ouvrir cette URL dans le navigateur
2. Choisir un compte Google
3. Redirection vers /auth/google/callback avec les tokens
    `,
  })
  @ApiResponse({ status: 302, description: 'Redirige vers Google' })
  googleAuth(): void {
    // Passport gère la redirection automatiquement
    // Aucun code nécessaire ici
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /auth/google/callback — Callback Google OAuth
  // ══════════════════════════════════════════════════════════

  /**
   * googleCallback()
   *
   * Google redirige ici après que l'utilisateur a choisi
   * son compte Google. GoogleAuthGuard vérifie le code
   * d'autorisation et GoogleStrategy extrait le profil.
   * OAuthService crée ou connecte le compte utilisateur.
   *
   * 💡 On utilise @Res() pour contrôler manuellement la réponse
   *    car en production on voudrait rediriger vers le frontend
   *    avec les tokens dans l'URL ou un cookie sécurisé.
   *
   *    Exemple production :
   *    ────────────────────────────────────────────────────
   *    res.redirect(
   *      `https://monapp.com/auth/callback?token=${tokens.accessToken}`
   *    );
   *    ────────────────────────────────────────────────────
   *
   * 💡 3 cas gérés par OAuthService.handleGoogleLogin() :
   *    1. Nouveau compte Google → crée l'utilisateur + OAuth account
   *    2. Compte OAuth existant → login direct
   *    3. Email existant (compte local) → lie le compte Google
   *
   * @param user → profil Google extrait par GoogleStrategy
   * @param res  → réponse Express pour contrôle manuel
   * @returns    → AuthTokens retournés en JSON (développement)
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Callback Google OAuth',
    description: `
Google redirige ici après l'authentification.
Crée ou connecte le compte utilisateur automatiquement.

**3 cas gérés** :
- Nouveau compte Google → crée l'utilisateur (emailVerified: true)
- Compte OAuth existant → connexion directe
- Email existant (compte local) → lie le compte Google

**En production** : rediriger vers le frontend avec les tokens
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens JWT retournés',
    schema: {
      example: {
        key: 'auth.login_success',
        message: 'Login successful',
        accessToken: 'eyJhbGc...',
        refreshToken: 'eyJhbGc...',
      },
    },
  })
  async googleCallback(
    @CurrentUser() user: GoogleUser,
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.oauthService.handleGoogleLogin(user);

    // 💡 En développement → retourne les tokens en JSON
    // 💡 En production → rediriger vers le frontend avec les tokens
    // ex: res.redirect(`https://monapp.com/auth/callback?token=${tokens.accessToken}`)
    res.json(tokens);
  }
}
