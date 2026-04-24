/**
 * ============================================================
 * TEST — UsersService (Tests unitaires)
 * ============================================================
 *
 * Ce fichier contient les tests unitaires du service UsersService.
 *
 * 🎯 Objectif :
 *    - Vérifier le bon fonctionnement de chaque méthode du service
 *    - Garantir les comportements d'erreur (404, 403)
 *    - Assurer la non-régression lors des évolutions
 *
 * 🧪 Outils utilisés :
 *    - Jest             → framework de test
 *    - @nestjs/testing  → utilitaires pour tester les services NestJS
 *
 * 🔧 Stratégie de mock :
 *    - PrismaService est mocké pour éviter les appels réels à la BD
 *    - I18nService est mocké pour retourner directement les clés
 *    - jest.clearAllMocks() est appelé avant chaque test pour
 *      éviter les effets de bord entre les tests
 *
 * 📋 Méthodes testées :
 *    - findAll()    → liste tous les utilisateurs
 *    - findOne()    → récupère un utilisateur par id
 *    - update()     → met à jour le profil utilisateur
 *    - remove()     → supprime un compte utilisateur
 *    - assignRole() → assigne un rôle à un utilisateur
 *
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import type {
  SafeUser,
  MessageResponse,
  PrismaUserMinimal,
  PrismaRole,
  PrismaUserRole,
} from '../types/users.types';

// ══════════════════════════════════════════════════════════
// 📌 MOCKS — Simulation des services externes
// ══════════════════════════════════════════════════════════

/**
 * Mock de PrismaService
 *
 * 💡 On utilise jest.Mock comme type pour chaque fonction mockée.
 *    Cela permet d'appeler .mockResolvedValue() avec n'importe
 *    quel type sans erreur TypeScript, tout en gardant la
 *    structure fidèle au vrai PrismaService.
 */
const mockPrismaService: {
  user: {
    findMany: jest.Mock<Promise<SafeUser[]>>;
    findUnique: jest.Mock<Promise<PrismaUserMinimal | null>>;
    update: jest.Mock<Promise<SafeUser>>;
    delete: jest.Mock<Promise<PrismaUserMinimal>>;
  };
  role: {
    findUnique: jest.Mock<Promise<PrismaRole | null>>;
  };
  userRole: {
    findUnique: jest.Mock<Promise<PrismaUserRole | null>>;
    create: jest.Mock<Promise<PrismaUserRole>>;
    delete: jest.Mock<Promise<PrismaUserRole>>;
  };
} = {
  user: {
    findMany: jest.fn() as jest.Mock<Promise<SafeUser[]>>,
    findUnique: jest.fn() as jest.Mock<Promise<PrismaUserMinimal | null>>,
    update: jest.fn() as jest.Mock<Promise<SafeUser>>,
    delete: jest.fn() as jest.Mock<Promise<PrismaUserMinimal>>,
  },
  role: {
    findUnique: jest.fn() as jest.Mock<Promise<PrismaRole | null>>,
  },
  userRole: {
    findUnique: jest.fn() as jest.Mock<Promise<PrismaUserRole | null>>,
    create: jest.fn() as jest.Mock<Promise<PrismaUserRole>>,
    delete: jest.fn() as jest.Mock<Promise<PrismaUserRole>>,
  },
};
/**
 * Mock de I18nService
 *
 * 💡 On utilise Pick<I18nService, ...> pour ne mocker que
 *    les méthodes réellement utilisées par UsersService,
 *    sans avoir à implémenter toute l'interface.
 */
const mockI18nService: Pick<I18nService, 'translate' | 'createResponse'> = {
  translate: jest.fn((key: string): string => key),
  createResponse: jest.fn(
    (key: string): MessageResponse => ({ key, message: key }),
  ),
};

// ══════════════════════════════════════════════════════════
// 📌 SUITE DE TESTS — UsersService
// ══════════════════════════════════════════════════════════

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;

  /**
   * ==========================================================
   * Setup — Initialisation avant chaque test
   * ==========================================================
   *
   * 💡 Pourquoi beforeEach ?
   *    - Garantit un environnement propre pour chaque test
   *    - Évite les effets de bord entre les tests
   *
   * 🔧 createTestingModule :
   *    Simule un module NestJS minimal avec les providers mockés
   *    à la place des vraies implémentations.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<typeof mockPrismaService>(PrismaService);

    /**
     * Réinitialise tous les mocks entre chaque test
     * pour éviter que les appels d'un test précédent
     * n'influencent le test suivant.
     */
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════
  // 📌 TESTS — findAll()
  // ══════════════════════════════════════════════════════════

  /**
   * Tests de la méthode findAll()
   *
   * 🎯 Vérifie :
   *    - que la liste retournée est bien un tableau
   *    - que les utilisateurs ont les bonnes propriétés
   *    - que le mot de passe n'est jamais exposé
   */
  describe('findAll()', () => {
    it('devrait retourner la liste des utilisateurs', async () => {
      const mockUsers: SafeUser[] = [
        {
          id: 'uuid-123',
          email: 'phanuel@example.com',
          firstName: 'Phanuel',
          lastName: null,
          status: 'ACTIVE',
          emailVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date(),
          roles: [],
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 TESTS — findOne()
  // ══════════════════════════════════════════════════════════

  /**
   * Tests de la méthode findOne()
   *
   * 🎯 Vérifie :
   *    - que l'utilisateur est retourné si trouvé
   *    - qu'une NotFoundException est levée si introuvable
   */
  describe('findOne()', () => {
    it('devrait retourner un utilisateur par son identifiant', async () => {
      const mockUser: PrismaUserMinimal = {
        id: 'uuid-123',
        email: 'phanuel@example.com',
        firstName: 'Phanuel',
        status: 'ACTIVE',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('uuid-123');
      expect(result).toHaveProperty('email');
    });

    it("devrait lever une NotFoundException si l'utilisateur est introuvable", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 TESTS — update()
  // ══════════════════════════════════════════════════════════

  /**
   * Tests de la méthode update()
   *
   * 🎯 Vérifie :
   *    - que le profil est bien mis à jour
   *    - qu'une ForbiddenException est levée si un utilisateur
   *      tente de modifier le profil d'un autre utilisateur
   *
   * 💡 La règle métier est : un utilisateur ne peut modifier
   *    que son propre profil, sauf s'il est administrateur.
   */
  describe('update()', () => {
    it('devrait mettre à jour le profil utilisateur', async () => {
      const mockExisting: PrismaUserMinimal = {
        id: 'uuid-123',
        email: 'phanuel@example.com',
      };

      const mockUpdated: SafeUser = {
        id: 'uuid-123',
        email: 'phanuel@example.com',
        firstName: 'NouveauNom',
        lastName: null,
        status: 'ACTIVE',
        emailVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        roles: [],
      };

      prisma.user.findUnique.mockResolvedValue(mockExisting);
      prisma.user.update.mockResolvedValue(mockUpdated);

      const result = await service.update('uuid-123', 'uuid-123', {
        firstName: 'NouveauNom',
      });

      expect(result).toHaveProperty('firstName', 'NouveauNom');
    });

    it("devrait lever une ForbiddenException lors de la modification du profil d'un autre utilisateur sans droits admin", async () => {
      await expect(
        service.update('uuid-123', 'other-uuid', { firstName: 'NouveauNom' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 TESTS — remove()
  // ══════════════════════════════════════════════════════════

  /**
   * Tests de la méthode remove()
   *
   * 🎯 Vérifie :
   *    - que le compte est bien supprimé
   *    - qu'une ForbiddenException est levée si un utilisateur
   *      tente de supprimer le compte d'un autre utilisateur
   *
   * 💡 Même logique que update() : un utilisateur ne peut
   *    supprimer que son propre compte.
   */
  describe('remove()', () => {
    it('devrait supprimer le compte utilisateur', async () => {
      const mockUser: PrismaUserMinimal = {
        id: 'uuid-123',
        email: 'phanuel@example.com',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove('uuid-123', 'uuid-123');
      expect(result).toHaveProperty('key', 'users.deleted');
    });

    it("devrait lever une ForbiddenException lors de la suppression du compte d'un autre utilisateur", async () => {
      await expect(service.remove('uuid-123', 'other-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 TESTS — assignRole()
  // ══════════════════════════════════════════════════════════

  /**
   * Tests de la méthode assignRole()
   *
   * 🎯 Vérifie :
   *    - que le rôle est bien assigné à l'utilisateur
   *    - qu'une NotFoundException est levée si le rôle
   *      demandé n'existe pas en base de données
   *
   * 💡 On vérifie que la réponse contient bien une clé
   *    de traduction — signe que l'opération a réussi.
   */
  describe('assignRole()', () => {
    it("devrait assigner un rôle à l'utilisateur", async () => {
      const mockUser: PrismaUserMinimal = {
        id: 'uuid-123',
        email: 'phanuel@example.com',
      };

      const mockRole: PrismaRole = {
        id: 'role-123',
        name: 'admin',
      };

      const mockUserRole: PrismaUserRole = {
        userId: 'uuid-123',
        roleId: 'role-123',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.role.findUnique.mockResolvedValue(mockRole);
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.userRole.create.mockResolvedValue(mockUserRole);

      const result = await service.assignRole('uuid-123', 'admin');
      expect(result).toHaveProperty('key');
    });

    it('devrait lever une NotFoundException si le rôle est introuvable', async () => {
      const mockUser: PrismaUserMinimal = {
        id: 'uuid-123',
        email: 'phanuel@example.com',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRole('uuid-123', 'unknown-role'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
