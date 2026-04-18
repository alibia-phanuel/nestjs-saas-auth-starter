import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserStatus } from '../generated/prisma/client.js';

// ── Types ────────────────────────────────────────────

type SafeUser = Omit<
  User,
  | 'password'
  | 'twoFactorSecret'
  | 'verificationToken'
  | 'resetToken'
  | 'resetTokenExpiry'
>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

// ─────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── SIGNUP ──────────────────────────────────────

  async signup(
    dto: SignupDto,
  ): Promise<{ key: string; message: string; user: Partial<SafeUser> }> {
    const existingUser: User | null = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        this.i18n.createResponse('auth.email_already_exists'),
      );
    }

    const hashedPassword: string = await bcrypt.hash(dto.password, 10);

    // Génère un token de vérification email
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user: Partial<SafeUser> = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        verificationToken,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Rappel Module 20 (13:35:43 Event Emitter)
    // Découplage total : AuthService ne connaît pas MailService
    this.eventEmitter.emit('user.created', {
      email: dto.email,
      firstName: dto.firstName,
      verificationToken,
    });

    const response = this.i18n.createResponse('auth.signup_success');
    return { key: response.key, message: response.message, user };
  }

  // ── LOGIN ───────────────────────────────────────

  async login(
    dto: LoginDto,
  ): Promise<{ key: string; message: string } & AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.invalid_credentials'),
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password ?? '',
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.invalid_credentials'),
      );
    }

    // Vérifie d'abord la suspension
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.account_suspended'),
      );
    }

    // Ensuite vérifie l'activation email
    if (!user.emailVerified || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.email_not_verified'),
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');
    return { key: response.key, message: response.message, ...tokens };
  }

  // ── REFRESH ACCESS TOKEN ─────────────────────────
  // Nom: refreshToken pour compatibilité avec les tests existants

  async refreshToken(token: string): Promise<AuthTokens> {
    // 1. Trouve le token en DB avec l'user associé
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // 2. Token inexistant ?
    if (!stored) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_invalid'),
      );
    }

    // 3. Token révoqué ?
    if (stored.isRevoked) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_invalid'),
      );
    }

    // 4. Token expiré ?
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_expired'),
      );
    }

    // 5. Révoque l'ancien token — rotation des tokens
    // Sécurité : un refresh token ne peut être utilisé qu'une seule fois
    await this.prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });

    // 6. Génère de nouveaux tokens
    const tokens = await this.generateTokens(stored.user.id, stored.user.email);

    // 7. Sauvegarde le nouveau refresh token
    await this.saveRefreshToken(stored.user.id, tokens.refreshToken);

    return tokens;
  }

  // ── VERIFY EMAIL ─────────────────────────────────

  async verifyEmail(token: string): Promise<{ key: string; message: string }> {
    // Cherche l'user avec ce token de vérification
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_invalid'),
      );
    }

    // Active le compte
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
        verificationToken: null,
      },
    });

    return this.i18n.createResponse('auth.email_verified');
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
