/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AuthService } from '../auth.service';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OAuthService } from '../oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  oAuthAccount: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
};

const mockI18nService = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string) => ({ key, message: key })),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};
const mockAuthService = {
  generateTokens: jest.fn(),
  saveRefreshToken: jest.fn(),
};
describe('OAuthService', () => {
  let service: OAuthService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  const googleUser = {
    providerId: 'google-123',
    email: 'phanuel@gmail.com',
    firstName: 'Phanuel',
    lastName: 'Tsopze',
    photo: 'https://photo.url',
  };

  // ── handleGoogleLogin() ──────────────────────────

  describe('handleGoogleLogin()', () => {
    it('should create new user if not exists and return tokens', async () => {
      // User n'existe pas encore
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: googleUser.email,
        firstName: googleUser.firstName,
        status: 'ACTIVE',
        emailVerified: true,
      });
      prisma.oAuthAccount.create.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.handleGoogleLogin(googleUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should login existing user with OAuth account', async () => {
      // OAuth account existe déjà
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth-123',
        userId: 'uuid-123',
        provider: 'GOOGLE',
        providerId: googleUser.providerId,
        user: {
          id: 'uuid-123',
          email: googleUser.email,
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
      prisma.refreshToken.create.mockResolvedValue({});

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.handleGoogleLogin(googleUser);

      expect(result).toHaveProperty('accessToken');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should link OAuth to existing email account', async () => {
      // Email existe mais pas de compte OAuth
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: googleUser.email,
        status: 'ACTIVE',
        emailVerified: true,
      });
      prisma.oAuthAccount.create.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.handleGoogleLogin(googleUser);

      expect(result).toHaveProperty('accessToken');
      expect(prisma.oAuthAccount.create).toHaveBeenCalledTimes(1);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
