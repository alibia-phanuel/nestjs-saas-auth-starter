import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { AuthTokens, JwtPayload } from './types/auth.types';
import { GoogleUser } from './strategies/google.strategy';
import { OAuthProvider, UserStatus } from '../generated/prisma/client';

// ─────────────────────────────────────────────────────

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── GOOGLE LOGIN ─────────────────────────────────

  async handleGoogleLogin(
    googleUser: GoogleUser,
  ): Promise<{ key: string; message: string } & AuthTokens> {
    // 1. Cherche si un compte OAuth existe déjà
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: OAuthProvider.GOOGLE,
          providerId: googleUser.providerId,
        },
      },
      include: { user: true },
    });

    // 2. OAuth account trouvé → login direct
    if (existingOAuth) {
      const tokens = await this.generateTokens(
        existingOAuth.user.id,
        existingOAuth.user.email,
      );
      await this.saveRefreshToken(existingOAuth.user.id, tokens.refreshToken);

      const response = this.i18n.createResponse('auth.login_success');
      return { key: response.key, message: response.message, ...tokens };
    }

    // 3. Cherche si l'email existe déjà (compte local)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    let userId: string;

    if (existingUser) {
      // 4a. Email existe → on lie le compte Google
      userId = existingUser.id;

      await this.prisma.oAuthAccount.create({
        data: {
          provider: OAuthProvider.GOOGLE,
          providerId: googleUser.providerId,
          userId,
        },
      });
    } else {
      // 4b. Nouvel utilisateur → on crée le compte
      // Compte Google = déjà vérifié par Google
      const newUser = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          emailVerified: true,
          status: UserStatus.ACTIVE,
          oauthAccounts: {
            create: {
              provider: OAuthProvider.GOOGLE,
              providerId: googleUser.providerId,
            },
          },
        },
      });

      userId = newUser.id;

      // Émet un event de bienvenue
      this.eventEmitter.emit('user.oauth.created', {
        email: googleUser.email,
        firstName: googleUser.firstName,
      });
    }

    const tokens = await this.generateTokens(userId, googleUser.email);
    await this.saveRefreshToken(userId, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');
    return { key: response.key, message: response.message, ...tokens };
  }

  // ── HELPERS PRIVÉS ──────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as never,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as never,
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }
}
