/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from '../api-key.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import * as bcrypt from 'bcryptjs';

const mockPrismaService = {
  apiKey: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('bcryptjs', () => ({
  ...jest.requireActual('bcryptjs'),
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockI18nService = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string) => ({ key, message: key })),
};

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(false); // défaut sécurisé
  });

  // ── create() ─────────────────────────────────────

  describe('create()', () => {
    it('should create an API key and return it once', async () => {
      prisma.apiKey.create.mockResolvedValue({
        id: 'uuid-123',
        name: 'Production API',
        key: 'sk_hashed_key',
        userId: 'user-123',
        isActive: true,
        createdAt: new Date(),
      });

      const result = await service.create('user-123', {
        name: 'Production API',
      });

      expect(result).toHaveProperty('rawKey');
      expect(result).toHaveProperty('key');
      expect(result.rawKey).toMatch(/^sk_/);
    });

    it('should hash the key before saving', async () => {
      // ARRANGE
      prisma.apiKey.create.mockImplementation(
        (args: { data: { key: string } }) => ({
          id: 'uuid-123',
          name: 'Production API',
          key: args.data.key, // retourne la vraie valeur passée
          userId: 'user-123',
          isActive: true,
          expiresAt: null,
          createdAt: new Date(),
        }),
      );

      const result = await service.create('user-123', {
        name: 'Production API',
      });

      // La rawKey commence par sk_
      expect(result.rawKey).toMatch(/^sk_/);

      // La clé stockée en DB ne doit PAS être la rawKey
      expect(result.rawKey).not.toBe(result.key);

      // La clé masquée doit commencer par sk_****
      expect(result.key).toMatch(/^sk_\*{4}/);
    });
  });

  // ── findAllByUser() ───────────────────────────────

  describe('findAllByUser()', () => {
    it('should return list of API keys without raw key', async () => {
      prisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'uuid-123',
          name: 'Production API',
          isActive: true,
          lastUsed: null,
          expiresAt: null,
          createdAt: new Date(),
        },
      ]);

      const result = await service.findAllByUser('user-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).not.toHaveProperty('key');
    });
  });

  // ── revoke() ──────────────────────────────────────

  describe('revoke()', () => {
    it('should revoke an API key', async () => {
      prisma.apiKey.update.mockResolvedValue({
        id: 'uuid-123',
        isActive: false,
      });

      const result = await service.revoke('uuid-123', 'user-123');

      expect(result).toHaveProperty('key', 'auth.api_key_revoked');
    });
  });

  // ── validate() ────────────────────────────────────

  describe('validate()', () => {
    it('should return user when API key is valid', async () => {
      const rawKey = 'sk_testkey123456';

      prisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'uuid-123',
          key: rawKey,
          isActive: true,
          expiresAt: null,
          user: {
            id: 'user-123',
            email: 'phanuel@example.com',
            status: 'ACTIVE',
          },
        },
      ]);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // ✅

      const result = await service.validate(rawKey);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('email');
    });

    it('should return null when API key not found', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.validate('sk_invalid');
      expect(result).toBeNull();
    });

    it('should return null when API key is revoked', async () => {
      // ✅ findMany retourne vide — isActive: false est filtré par le service
      prisma.apiKey.findMany.mockResolvedValue([]);

      const result = await service.validate('sk_testkey');
      expect(result).toBeNull();
    });

    it('should return null when API key is expired', async () => {
      prisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'uuid-123',
          key: 'sk_hashed',
          isActive: true,
          expiresAt: new Date(Date.now() - 1000),
          user: { id: 'user-123', email: 'phanuel@example.com' },
        },
      ]);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // ✅

      const result = await service.validate('sk_testkey');
      expect(result).toBeNull();
    });
  });
});
