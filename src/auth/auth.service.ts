import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { User, UserStatus } from '../generated/prisma/client.js';
import { TwoFactorService } from './two-factor.service';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { AuthTokens, JwtPayload, Setup2FAResult } from './types/auth.types';

// ── Types ────────────────────────────────────────────

type SafeUser = Omit<
  User,
  | 'password'
  | 'twoFactorSecret'
  | 'otpCode'
  | 'otpExpiresAt'
  | 'resetToken'
  | 'resetTokenExpiry'
>;

// Type de retour du login — normal ou 2FA requis
type LoginResponse =
  | ({ key: string; message: string } & AuthTokens)
  | { key: string; message: string; requiresTwoFactor: true; email: string };

// ─────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly twoFactor: TwoFactorService,
  ) {}

  // ── HELPERS OTP ──────────────────────────────────

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);
    return expiry;
  }

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
    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    const user: Partial<SafeUser> = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        otpCode: otp,
        otpExpiresAt,
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

    this.eventEmitter.emit('user.created', {
      email: dto.email,
      firstName: dto.firstName,
      otp,
    });

    const response = this.i18n.createResponse('auth.signup_success');
    return { key: response.key, message: response.message, user };
  }

  // ── VERIFY OTP ───────────────────────────────────

  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<{ key: string; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    if (user.otpCode !== dto.otp) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return this.i18n.createResponse('auth.otp_verified');
  }

  // ── FORGOT PASSWORD ──────────────────────────────

  async forgotPassword(
    email: string,
  ): Promise<{ key: string; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return this.i18n.createResponse('auth.password_reset_sent');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt },
    });

    this.eventEmitter.emit('password.reset', {
      email: user.email,
      firstName: user.firstName,
      otp,
    });

    return this.i18n.createResponse('auth.password_reset_sent');
  }

  // ── RESET PASSWORD ───────────────────────────────

  async resetPassword(dto: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<{ key: string; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    if (user.otpCode !== dto.otp) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.otp_invalid'),
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return this.i18n.createResponse('auth.password_reset_success');
  }

  // ── LOGIN ───────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResponse> {
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

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.account_suspended'),
      );
    }

    if (!user.emailVerified || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.email_not_verified'),
      );
    }

    // Si 2FA activé → on ne retourne PAS les tokens
    // Le frontend appelle POST /auth/2fa/verify ensuite
    if (user.twoFactorEnabled) {
      return {
        ...this.i18n.createResponse('auth.2fa_required'),
        requiresTwoFactor: true as const,
        email: user.email,
      };
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');
    return { key: response.key, message: response.message, ...tokens };
  }

  // ── REFRESH TOKEN ────────────────────────────────

  async refreshToken(token: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_invalid'),
      );
    }

    if (stored.isRevoked) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_invalid'),
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.token_expired'),
      );
    }

    await this.prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(stored.user.id, stored.user.email);

    await this.saveRefreshToken(stored.user.id, tokens.refreshToken);

    return tokens;
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

  // ── 2FA SETUP ────────────────────────────────────

  async setup2FA(userId: string): Promise<Setup2FAResult> {
    return this.twoFactor.setup(userId);
  }

  // ── 2FA ENABLE ───────────────────────────────────

  async enable2FA(
    userId: string,
    code: string,
  ): Promise<{ key: string; message: string }> {
    return this.twoFactor.enable(userId, code);
  }

  // ── 2FA DISABLE ──────────────────────────────────

  async disable2FA(
    userId: string,
    code: string,
  ): Promise<{ key: string; message: string }> {
    return this.twoFactor.disable(userId, code);
  }

  // ── 2FA VERIFY LOGIN ─────────────────────────────

  async verify2FA(
    dto: Verify2faDto,
  ): Promise<{ key: string; message: string } & AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.invalid_credentials'),
      );
    }

    const isValid = await this.twoFactor.verify(dto.email, dto.code);

    if (!isValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');
    return { key: response.key, message: response.message, ...tokens };
  }
}
