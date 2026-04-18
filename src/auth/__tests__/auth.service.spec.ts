/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import * as bcrypt from 'bcryptjs';

// =============================================
// Définition des types pour les mocks (très important !)
// =============================================

/** Type complet du mock pour PrismaService */
type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

/** Type complet du mock pour I18nService */
type MockI18nService = {
  translate: jest.Mock;
  createResponse: jest.Mock;
};

// =============================================
// Création des mocks avec typage
// =============================================

const mockPrismaService: MockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockI18nService: MockI18nService = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string, data?: any) => ({
    key,
    message: key,
    ...data,
  })),
};

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: MockPrismaService; // Typage fort ici
  let i18nMock: MockI18nService; // Typage fort ici

  // Données de test réutilisables
  const signupDto = {
    email: 'phanuel@example.com',
    password: 'SecurePass123!',
    firstName: 'Phanuel',
    lastName: 'Tsopze',
  };

  // =============================================
  // Avant chaque test
  // =============================================
  beforeEach(async () => {
    jest.clearAllMocks(); // Nettoie tous les mocks

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // On récupère les mocks avec le bon typage
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    prismaMock = module.get(PrismaService) as MockPrismaService;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    i18nMock = module.get(I18nService) as MockI18nService;
  });

  // =============================================
  // Tests de la méthode signup()
  // =============================================
  describe('signup()', () => {
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      // ARRANGE
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      // ACT
      const result = await service.signup(signupDto);

      // ASSERT
      expect(result.key).toBe('auth.signup_success');
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });

    it('devrait hasher le mot de passe avant de le sauvegarder', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      await service.signup(signupDto);

      const createArg = prismaMock.user.create.mock.calls[0][0];
      const hashedPassword: string = createArg.data.password;

      expect(hashedPassword).not.toBe(signupDto.password);
      expect(await bcrypt.compare(signupDto.password, hashedPassword)).toBe(
        true,
      );
    });

    it('devrait renvoyer une erreur ConflictException si l’email existe déjà', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-uuid',
        email: signupDto.email,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('ne devrait jamais retourner le mot de passe dans la réponse', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      const result = await service.signup(signupDto);

      expect(result).not.toHaveProperty('password');
    });

    it('devrait utiliser le service de traduction pour le message de succès', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
      });

      await service.signup(signupDto);

      expect(i18nMock.createResponse).toHaveBeenCalled();
    });
  });
});
