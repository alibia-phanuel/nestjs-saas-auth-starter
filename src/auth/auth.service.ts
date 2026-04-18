/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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

// ────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly jwt: JwtService,
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

    const user: Partial<SafeUser> = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
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

    // ✅ Vérifie d'abord la suspension — cas le plus bloquant
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.account_suspended'),
      );
    }

    // ✅ Ensuite vérifie l'activation email
    if (!user.emailVerified || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.email_not_verified'),
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');

    return {
      key: response.key,
      message: response.message,
      ...tokens,
    };
  }

  // ── HELPERS PRIVÉS ──────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email };

    // ✅ Cast en 'any' pour contourner le type StringValue de @nestjs/jwt
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as any,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}
