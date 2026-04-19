import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { Setup2FAResult, MessageResponse } from './types/auth.types';

// ─────────────────────────────────────────────────────

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // ── SETUP — génère le secret + QR Code ───────────

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

    const secret = authenticator.generateSecret();

    const otpauthUrl = authenticator.keyuri(
      user.email,
      'nestjs-saas-starter',
      secret,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCode = await toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCode };
  }

  // ── ENABLE — vérifie le code et active le 2FA ────

  async enable(userId: string, code: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('users.not_found'),
      );
    }

    if (!user.twoFactorSecret) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_not_setup'),
      );
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

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

  // ── DISABLE — désactive le 2FA ───────────────────

  async disable(userId: string, code: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.createResponse('users.not_found'),
      );
    }

    if (!user.twoFactorSecret) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_not_setup'),
      );
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException(
        this.i18n.createResponse('auth.2fa_invalid'),
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return this.i18n.createResponse('auth.2fa_disabled');
  }

  // ── VERIFY — vérifie le code lors du login ───────

  async verify(email: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      return false;
    }

    return authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
  }
}
