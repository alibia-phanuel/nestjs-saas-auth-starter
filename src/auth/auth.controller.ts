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
 * 📋 Endpoints exposés :
 *    ─────────────────────────────────────────────────────
 *    POST /auth/signup            → Inscription
 *    POST /auth/verify-otp        → Vérification OTP email
 *    POST /auth/login             → Connexion classique
 *    POST /auth/refresh           → Renouvellement des tokens
 *    POST /auth/forgot-password   → Demande de réinitialisation
 *    POST /auth/reset-password    → Nouveau mot de passe
 *    GET  /auth/me                → Profil utilisateur connecté
 *    POST /auth/2fa/setup         → Configurer le 2FA
 *    POST /auth/2fa/enable        → Activer le 2FA
 *    POST /auth/2fa/disable       → Désactiver le 2FA
 *    POST /auth/2fa/verify        → Vérifier le code 2FA
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
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type {
  GoogleUser,
  JwtPayload,
  AuthTokens,
  MessageResponse,
  Setup2FAResult,
} from './types/auth.types';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import type { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OAuthService } from './oauth.service';

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
   * @HttpCode(201) → retourne 201 Created (pas 200 par défaut)
   * @param dto → SignupDto contenant email, password, prénom, nom
   * @returns   → MessageResponse confirmant l'envoi de l'OTP
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscription — envoie un OTP par email' })
  @ApiResponse({ status: 201, description: 'OTP envoyé par email' })
  @ApiResponse({
    status: 409,
    description: 'Un compte avec cet email existe déjà',
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
   * @param dto → VerifyOtpDto contenant email + code OTP à 6 chiffres
   * @returns   → MessageResponse confirmant l'activation du compte
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vérifier l'OTP pour activer le compte" })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'Compte activé avec succès' })
  @ApiResponse({ status: 401, description: 'OTP invalide ou expiré' })
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
   * @param dto → LoginDto contenant email + password
   * @returns   → AuthTokens (accessToken + refreshToken)
   *              ou { requiresTwoFactor: true } si 2FA activé
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter avec email et mot de passe' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Retourne les tokens JWT' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
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
   * @param dto → RefreshTokenDto contenant le refreshToken
   * @returns   → AuthTokens avec de nouveaux tokens
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rafraîchir l'access token" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Nouveaux tokens retournés' })
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
   *
   * @param dto → ForgotPasswordDto contenant l'email
   * @returns   → MessageResponse (même réponse dans tous les cas)
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demander une réinitialisation — envoie un OTP par email',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: "OTP envoyé si l'email existe" })
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
   * @param dto → ResetPasswordDto contenant email + OTP + newPassword
   * @returns   → MessageResponse confirmant la réinitialisation
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Réinitialiser le mot de passe avec l'OTP" })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès',
  })
  @ApiResponse({ status: 401, description: 'OTP invalide ou expiré' })
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
   * @UseGuards(JwtAuthGuard) → token JWT obligatoire
   * @ApiBearerAuth()         → documente l'auth JWT dans Swagger
   *
   * @param user → utilisateur extrait du token JWT par JwtStrategy
   * @returns    → JwtPayload contenant { sub, email }
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Récupérer l'utilisateur actuellement connecté" })
  @ApiResponse({ status: 200, description: "Données de l'utilisateur courant" })
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
   * @param user → utilisateur connecté (on a besoin de son id)
   * @returns    → Setup2FAResult contenant secret + otpauthUrl + qrCode
   */
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Générer un code QR pour l'authentification à deux facteurs — à scanner avec Google Authenticator",
  })
  @ApiResponse({ status: 200, description: 'Retourne le QR code et le secret' })
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
   * @param user → utilisateur connecté (on a besoin de son id)
   * @param dto  → Enable2faDto contenant le code à 6 chiffres
   * @returns    → MessageResponse confirmant l'activation
   */
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Activer l'authentification à deux facteurs après avoir scanné le code QR",
  })
  @ApiBody({ type: Enable2faDto })
  @ApiResponse({
    status: 200,
    description: 'Authentification à deux facteurs activée',
  })
  @ApiResponse({ status: 401, description: 'Code invalide' })
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
   * @param user → utilisateur connecté (on a besoin de son id)
   * @param dto  → Enable2faDto contenant le code à 6 chiffres
   * @returns    → MessageResponse confirmant la désactivation
   */
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désactiver le 2FA' })
  @ApiBody({ type: Enable2faDto })
  @ApiResponse({
    status: 200,
    description: 'Authentification à deux facteurs désactivée',
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
   * @param dto → Verify2faDto contenant email + code 2FA
   * @returns   → AuthTokens (accessToken + refreshToken)
   */
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier le code à deux facteurs après la connexion',
  })
  @ApiBody({ type: Verify2faDto })
  @ApiResponse({ status: 200, description: 'Retourne les tokens JWT' })
  @ApiResponse({ status: 401, description: 'Code à deux facteurs invalide' })
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
   * @returns void — Passport gère la redirection (302)
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Se connecter avec Google — redirige vers Google OAuth',
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
   * @param user → profil Google extrait par GoogleStrategy
   * @param res  → réponse Express pour contrôle manuel
   * @returns    → AuthTokens retournés en JSON (développement)
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback Google OAuth' })
  @ApiResponse({ status: 200, description: 'Retourne les tokens JWT' })
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
