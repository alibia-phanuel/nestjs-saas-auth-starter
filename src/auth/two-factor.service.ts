import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { Setup2FAResult, MessageResponse } from './types/auth.types';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // ── SETUP ────────────────────────────────────────

  async setup(userId: string): Promise<Setup2FAResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('users.not_found'),
      );
    }

    // Génère un secret base32
    const secretObj = speakeasy.generateSecret({
      name: `nestjs-saas-starter (${user.email})`,
      length: 20,
    });

    const secret = secretObj.base32;
    const otpauthUrl = secretObj.otpauth_url ?? '';

    console.log('✅ 2FA Secret generated:', secret);
    console.log('✅ OTPAuth URL:', otpauthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCode };
  }

  // ── ENABLE ───────────────────────────────────────

  async enable(userId: string, code: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('users.not_found'),
      );
    }

    if (!user.twoFactorSecret) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1, // tolérance de 30 secondes
    });

    console.log('🔍 Enable 2FA verify result:', isValid, 'code:', code);

    if (!isValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return this.i18n.createResponse('auth.2fa_enabled');
  }

  // ── DISABLE ──────────────────────────────────────

  async disable(userId: string, code: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return this.i18n.createResponse('auth.2fa_disabled');
  }

  // ── VERIFY ───────────────────────────────────────

  async verify(email: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      return false;
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    console.log('🔍 Login 2FA verify result:', isValid, 'code:', code);

    return isValid;
  }
}
