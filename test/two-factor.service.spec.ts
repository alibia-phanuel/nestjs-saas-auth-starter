import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from '../src/auth/two-factor.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { I18nService } from '../src/i18n/i18n.service';
import { describe, it, beforeEach, expect, jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// ✅ jest.fn<any>() → on type explicitement le retour en `any`
// Sans ce typage, TypeScript infère `never` et rejette toute valeur passée
// à mockResolvedValue() ou mockReturnValue()

const mockPrismaService = {
  user: {
    findUnique: jest.fn<any>(),
    update: jest.fn<any>(),
  },
};

const mockI18nService = {
  translate: jest.fn<any>((key: string) => key),
  createResponse: jest.fn<any>((key: string) => ({ key, message: key })),
};

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'MOCK_SECRET_BASE32',
    otpauth_url: 'otpauth://totp/nestjs-saas-starter:test@test.com?secret=MOCK',
  })),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() =>
    Promise.resolve('data:image/png;base64,MOCK_QR_CODE'),
  ),
}));

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('setup()', () => {
    it('should generate secret and QR code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'test@test.com',
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.setup('uuid-123');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpauthUrl');
      expect(result).toHaveProperty('qrCode');
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setup('unknown')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('enable()', () => {
    it('should enable 2FA when code is valid', async () => {
      const speakeasy = await import('speakeasy');
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        twoFactorSecret: 'MOCK_SECRET',
        twoFactorEnabled: false,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.enable('uuid-123', '847392');
      expect(result).toHaveProperty('key', 'auth.2fa_enabled');
    });

    it('should throw if code is invalid', async () => {
      const speakeasy = await import('speakeasy');
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        twoFactorSecret: 'MOCK_SECRET',
        twoFactorEnabled: false,
      });

      await expect(service.enable('uuid-123', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if no secret configured', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        twoFactorSecret: null,
        twoFactorEnabled: false,
      });

      await expect(service.enable('uuid-123', '847392')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('disable()', () => {
    it('should disable 2FA when code is valid', async () => {
      const speakeasy = await import('speakeasy');
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        twoFactorSecret: 'MOCK_SECRET',
        twoFactorEnabled: true,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.disable('uuid-123', '847392');
      expect(result).toHaveProperty('key', 'auth.2fa_disabled');
    });

    it('should throw if code is invalid', async () => {
      const speakeasy = await import('speakeasy');
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        twoFactorSecret: 'MOCK_SECRET',
        twoFactorEnabled: true,
      });

      await expect(service.disable('uuid-123', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verify()', () => {
    it('should return true when code is valid', async () => {
      const speakeasy = await import('speakeasy');
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      prisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: 'MOCK_SECRET',
      });

      const result = await service.verify('test@test.com', '847392');
      expect(result).toBe(true);
    });

    it('should return false if no secret', async () => {
      prisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: null,
      });

      const result = await service.verify('test@test.com', '847392');
      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.verify('unknown@test.com', '847392');
      expect(result).toBe(false);
    });
  });
});
