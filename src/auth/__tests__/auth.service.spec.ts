/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import * as bcrypt from 'bcryptjs';

// ── Mocks ──────────────────────────────────────────

const mockPrismaService = {
  user: {
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
      // ARRANGE
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({});
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-mock')
        .mockResolvedValueOnce('refresh-token-mock');

      // ACT
      const result = await service.login(loginDto);

      // ASSERT
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
});
