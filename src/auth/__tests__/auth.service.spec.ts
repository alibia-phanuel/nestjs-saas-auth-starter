import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import * as bcrypt from 'bcryptjs';

// ── Mocks ──────────────────────────────────────────

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockI18nService = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string) => ({ key, message: key })),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  // ── signup() ────────────────────────────────────

  describe('signup()', () => {
    const signupDto = {
      email: 'phanuel@example.com',
      password: 'SecurePass123!',
      firstName: 'Phanuel',
      lastName: 'Tsopze',
    };

    it('should create a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      const result = await service.signup(signupDto);
      expect(result).toHaveProperty('key', 'auth.signup_success');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should hash the password before saving', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      await service.signup(signupDto);

      const createCall = prisma.user.create.mock.calls[0][0];
      const hashedPassword: string = createCall.data.password;

      expect(hashedPassword).not.toBe(signupDto.password);
      expect(await bcrypt.compare(signupDto.password, hashedPassword)).toBe(
        true,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-uuid',
        email: signupDto.email,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should not return the password in the response', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      const result = await service.signup(signupDto);
      expect(result).not.toHaveProperty('password');
    });

    it('should emit user.created event after signup', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      await service.signup(signupDto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({ email: signupDto.email }),
      );
    });
  });

  // ── login() ─────────────────────────────────────

  describe('login()', () => {
    const loginDto = {
      email: 'phanuel@example.com',
      password: 'SecurePass123!',
    };

    const hashedPassword = bcrypt.hashSync('SecurePass123!', 10);

    const mockUser = {
      id: 'uuid-123',
      email: 'phanuel@example.com',
      password: hashedPassword,
      firstName: 'Phanuel',
      status: 'ACTIVE',
      emailVerified: true,
      twoFactorEnabled: false,
    };

    it('should return access and refresh tokens on success', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({});
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-mock')
        .mockResolvedValueOnce('refresh-token-mock');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('key', 'auth.login_success');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: bcrypt.hashSync('WrongPassword!', 10),
      });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is PENDING', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'PENDING',
        emailVerified: false,
      });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is SUSPENDED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── refreshToken() ───────────────────────────────

  describe('refreshToken()', () => {
    it('should return new tokens when refresh token is valid', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-uuid',
        token: 'valid-refresh-token',
        userId: 'uuid-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: {
          id: 'uuid-123',
          email: 'phanuel@example.com',
          status: 'ACTIVE',
        },
      });

      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-uuid',
        token: 'revoked-token',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await expect(service.refreshToken('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-uuid',
        token: 'expired-token',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── verifyEmail() ───────────────────────────────

  describe('verifyEmail()', () => {
    it('should activate account when token is valid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        verificationToken: 'valid-token',
        emailVerified: false,
        status: 'PENDING',
      });

      prisma.user.update.mockResolvedValue({
        id: 'uuid-123',
        emailVerified: true,
        status: 'ACTIVE',
      });

      const result = await service.verifyEmail('valid-token');
      expect(result).toHaveProperty('key', 'auth.email_verified');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: true,
            status: 'ACTIVE',
            verificationToken: null,
          }),
        }),
      );
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
