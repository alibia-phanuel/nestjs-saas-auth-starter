import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import type { JwtPayload } from './types/auth.types';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OAuthService } from './oauth.service';
import type { GoogleUser } from './strategies/google.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscription — envoie un OTP par email' })
  @ApiResponse({ status: 201, description: 'OTP envoyé par email' })
  @ApiResponse({
    status: 409,
    description: 'Un compte avec cet email existe déjà',
  })
  async signup(@Body() dto: SignupDto): Promise<unknown> {
    return this.authService.signup(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vérifier l'OTP pour activer le compte" })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'Compte activé avec succès' })
  @ApiResponse({ status: 401, description: 'OTP invalide ou expiré' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<unknown> {
    return this.authService.verifyOtp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter avec email et mot de passe' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Retourne les tokens JWT' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginDto): Promise<unknown> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rafraîchir l'access token" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Nouveaux tokens retournés' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<unknown> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demander une réinitialisation — envoie un OTP par email',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: "OTP envoyé si l'email existe" })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<unknown> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Réinitialiser le mot de passe avec l'OTP" })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès',
  })
  @ApiResponse({ status: 401, description: 'OTP invalide ou expiré' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<unknown> {
    return this.authService.resetPassword({
      email: dto.email,
      otp: dto.otp,
      newPassword: dto.newPassword,
    });
  }

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

  // ── POST /auth/2fa/setup ───────────────────────

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate 2FA QR code — scan with Google Authenticator',
  })
  @ApiResponse({ status: 200, description: 'Returns QR code and secret' })
  async setup2FA(@CurrentUser() user: { id: string }) {
    return this.authService.setup2FA(user.id);
  }

  // ── POST /auth/2fa/enable ──────────────────────

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA after scanning QR code' })
  @ApiBody({ type: Enable2faDto })
  @ApiResponse({ status: 200, description: '2FA enabled' })
  @ApiResponse({ status: 401, description: 'Invalid code' })
  async enable2FA(
    @CurrentUser() user: { id: string },
    @Body() dto: Enable2faDto,
  ) {
    return this.authService.enable2FA(user.id, dto.code);
  }

  // ── POST /auth/2fa/disable ─────────────────────

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBody({ type: Enable2faDto })
  @ApiResponse({ status: 200, description: '2FA disabled' })
  async disable2FA(
    @CurrentUser() user: { id: string },
    @Body() dto: Enable2faDto,
  ) {
    return this.authService.disable2FA(user.id, dto.code);
  }

  // ── POST /auth/2fa/verify ──────────────────────
  // Appelé après login quand requiresTwoFactor: true

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code after login' })
  @ApiBody({ type: Verify2faDto })
  @ApiResponse({ status: 200, description: 'Returns JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async verify2FA(@Body() dto: Verify2faDto) {
    return this.authService.verify2FA(dto);
  }

  // ── GET /auth/google ───────────────────────────
  // Redirige vers Google pour l'authentification

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Login with Google — redirects to Google OAuth' })
  @ApiResponse({ status: 302, description: 'Redirects to Google' })
  googleAuth(): void {
    // Passport gère la redirection automatiquement
  }

  // ── GET /auth/google/callback ──────────────────
  // Google redirige ici après authentification

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT tokens' })
  async googleCallback(
    @CurrentUser() user: GoogleUser,
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.oauthService.handleGoogleLogin(user);
    // En production : redirige vers le frontend avec les tokens
    // Ex: res.redirect(`https://yourapp.com/auth/callback?token=${tokens.accessToken}`)
    res.json(tokens);
  }
}
