/**
 * ============================================================
 * TESTS — OrganizationsService (Tests unitaires)
 * ============================================================
 *
 * Ce fichier contient les tests unitaires du service OrganizationsService.
 * Chaque méthode publique est couverte avec ses cas nominaux et ses cas d'erreur.
 *
 * 💡 Philosophie des tests unitaires ici :
 *    - On isole totalement le service de ses dépendances réelles
 *    - PrismaService, I18nService et EventEmitter2 sont tous mockés
 *    - On vérifie uniquement la logique métier du service
 *
 * ⚙️ Architecture des mocks :
 *    ─────────────────────────────────────────────────────
 *    - MockPrismaService  → delegates Prisma typés avec jest.Mock
 *    - mockI18nService    → retourne la clé i18n telle quelle
 *    - mockEventEmitter   → capture les événements émis
 *    - makeMockPrisma()   → factory recréant les mocks à chaque test
 *                           pour éviter les fuites d'état entre tests
 *    ─────────────────────────────────────────────────────
 *
 * 🔐 Règles métier testées :
 *    ─────────────────────────────────────────────────────
 *    - create()           → slug unique, créateur ajouté comme OWNER
 *    - findAllByUser()    → retourne les organisations de l'utilisateur
 *    - findOne()          → vérification membership + not found
 *    - inviteMember()     → seuls OWNER/ADMIN peuvent inviter
 *    - acceptInvitation() → token valide, non expiré, non déjà accepté
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Pourquoi jest.Mock (non paramétré) sur les delegates Prisma ?
 *    Prisma génère des surcharges multiples sur findUnique/create
 *    selon la présence ou non d'un `include`. Typer avec les surcharges
 *    natives cause des conflits "argument non attribuable → never".
 *    jest.Mock brut contourne ce problème tout en gardant les fixtures
 *    explicitement typées via OrgWithMembers et Invitation.
 *
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Organization,
  OrganizationMember,
  Invitation,
  MemberRole,
  PlanType,
} from '../../generated/prisma';
import { OrganizationsService } from '../organizations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';

// ══════════════════════════════════════════════════════════
// 📌 TYPES — Delegates Prisma mockés
// ══════════════════════════════════════════════════════════

/**
 * MockPrismaService
 *
 * Représente la structure partielle de PrismaService utilisée
 * par OrganizationsService, avec chaque méthode remplacée par
 * un jest.Mock non paramétré.
 *
 * 💡 On n'utilise pas les types natifs Prisma ici car leurs
 *    surcharges génériques provoquent des conflits de type
 *    sur mockResolvedValue. Les fixtures sont typées séparément.
 */
type MockPrismaService = {
  organization: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  organizationMember: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  invitation: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

// ══════════════════════════════════════════════════════════
// 📌 TYPES — Relations Prisma incluses
// ══════════════════════════════════════════════════════════

/**
 * OrgWithMembers
 *
 * Type local représentant une Organization telle que retournée
 * par Prisma avec `include: { members: true }`.
 *
 * 💡 Prisma ne génère pas ce type directement — il faut
 *    l'intersectionner manuellement pour typer les fixtures.
 */
type OrgWithMembers = Organization & { members: OrganizationMember[] };

// ══════════════════════════════════════════════════════════
// 📌 FIXTURES — Données de test réutilisables
// ══════════════════════════════════════════════════════════

/**
 * NOW
 * Date de référence partagée par toutes les fixtures.
 * Garantit la cohérence des timestamps entre les objets liés.
 */
const NOW = new Date();

/**
 * fakeOrg
 *
 * Organisation de test avec un membre OWNER.
 * Utilisée comme base pour tous les tests nécessitant une org existante.
 *
 * 💡 On la spread pour créer des variantes (ex: membres vides, rôle MEMBER)
 *    sans modifier la fixture originale.
 */
const fakeOrg: OrgWithMembers = {
  id: 'org-123',
  name: 'Acme Corp',
  slug: 'acme-corp',
  planType: PlanType.FREE,
  createdAt: NOW,
  updatedAt: NOW,
  members: [
    {
      id: 'mem-123',
      userId: 'user-123',
      organizationId: 'org-123',
      role: MemberRole.OWNER,
      joinedAt: NOW,
    },
  ],
};

/**
 * fakeInvitation
 *
 * Invitation de test valide (non expirée, non acceptée).
 * Utilisée comme base pour les tests de acceptInvitation().
 *
 * 💡 expiresAt est fixé à +24h pour simuler une invitation fraîche.
 *    On la spread pour créer les variantes expirée/déjà acceptée.
 */
const fakeInvitation: Invitation = {
  id: 'inv-123',
  email: 'colleague@example.com',
  token: 'invite-token',
  organizationId: 'org-123',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  acceptedAt: null,
  createdAt: NOW,
};

// ══════════════════════════════════════════════════════════
// 📌 FACTORY — Mock Prisma
// ══════════════════════════════════════════════════════════

/**
 * makeMockPrisma()
 *
 * Factory qui crée une nouvelle instance du mock Prisma à chaque test.
 *
 * 💡 Pourquoi une factory plutôt qu'une constante globale ?
 *    Si le mock était une constante partagée, les mockResolvedValue
 *    définis dans un test contamineraient les tests suivants.
 *    La factory garantit un état propre à chaque beforeEach().
 *
 * @returns MockPrismaService → mock frais avec tous les jest.fn() réinitialisés
 */
const makeMockPrisma = (): MockPrismaService => ({
  organization: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organizationMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  invitation: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

// ══════════════════════════════════════════════════════════
// 📌 MOCKS — Services externes
// ══════════════════════════════════════════════════════════

/**
 * mockI18nService
 *
 * Mock du service d'internationalisation.
 *
 * 💡 translate() → retourne la clé telle quelle (pas de traduction réelle)
 *    createResponse() → retourne { key, message: key } pour faciliter
 *    les assertions sur les clés i18n sans dépendre des traductions.
 */
const mockI18nService: jest.Mocked<
  Pick<I18nService, 'translate' | 'createResponse'>
> = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string) => ({ key, message: key })),
};

/**
 * mockEventEmitter
 *
 * Mock de l'EventEmitter2 NestJS.
 *
 * 💡 Permet de vérifier que les événements métier sont bien émis
 *    (ex: 'organization.invitation') sans déclencher les vrais listeners.
 */
const mockEventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>> = {
  emit: jest.fn(),
};

// ══════════════════════════════════════════════════════════
// 📌 SUITE — OrganizationsService
// ══════════════════════════════════════════════════════════

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: MockPrismaService;

  /**
   * beforeEach()
   *
   * Recrée un module NestJS isolé avant chaque test.
   *
   * ⚙️ Étapes :
   *    1. Crée un mock Prisma frais via makeMockPrisma()
   *    2. Monte un module de test avec toutes les dépendances mockées
   *    3. Récupère les instances injectées (service + prisma mock)
   *    4. Réinitialise tous les compteurs de mocks (clearAllMocks)
   */
  beforeEach(async () => {
    const mockPrisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: I18nService, useValue: mockI18nService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<MockPrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  // ── create() ─────────────────────────────────────────────────────────────────

  /**
   * create()
   *
   * Crée une nouvelle organisation et ajoute le créateur comme OWNER.
   *
   * 🔐 Règle métier :
   *    - Le slug doit être unique → ConflictException si déjà pris
   *    - Le créateur est automatiquement ajouté comme OWNER
   */
  describe('create()', () => {
    const dto = { name: 'Acme Corp', slug: 'acme-corp' };

    it('Il faudrait créer une organisation et ajouter le créateur en tant que PROPRIÉTAIRE', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue(fakeOrg);

      const result = await service.create('user-123', dto);

      expect(result).toHaveProperty('name', 'Acme Corp');
      expect(prisma.organization.create).toHaveBeenCalledTimes(1);
    });

    it('devrait lancer une exception ConflictException si le slug est déjà pris', async () => {
      // 💡 findUnique retourne une org existante → slug déjà pris
      prisma.organization.findUnique.mockResolvedValue(fakeOrg);

      await expect(service.create('user-123', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ── findAllByUser() ───────────────────────────────────────────────────────────

  /**
   * findAllByUser()
   *
   * Retourne toutes les organisations dont l'utilisateur est membre.
   *
   * ⚙️ La réponse inclut la relation `organization` via organizationMember.
   */
  describe('findAll()', () => {
    it('devrait renvoyer les organisations associées à un utilisateur', async () => {
      // 💡 Fixture locale avec la relation organization incluse
      const memberWithOrg: OrganizationMember & { organization: Organization } =
        {
          id: 'mem-123',
          userId: 'user-123',
          organizationId: 'org-123',
          role: MemberRole.OWNER,
          joinedAt: NOW,
          organization: {
            id: 'org-123',
            name: 'Acme Corp',
            slug: 'acme-corp',
            planType: PlanType.FREE,
            createdAt: NOW,
            updatedAt: NOW,
          },
        };

      prisma.organizationMember.findMany.mockResolvedValue([memberWithOrg]);

      const result = await service.findAllByUser('user-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('organization');
    });
  });

  // ── findOne() ────────────────────────────────────────────────────────────────

  /**
   * findOne()
   *
   * Retourne une organisation si l'utilisateur en est membre.
   *
   * 🔐 Règles métier :
   *    - Organisation inexistante    → NotFoundException
   *    - Utilisateur non membre      → ForbiddenException
   */
  describe('findOne()', () => {
    it("doit renvoyer l'organisation si l'utilisateur en est membre", async () => {
      prisma.organization.findUnique.mockResolvedValue(fakeOrg);

      const result = await service.findOne('org-123', 'user-123');
      expect(result).toHaveProperty('name', 'Acme Corp');
    });

    it("devrait lever une exception NotFoundException si l'organisation n'est pas trouvée", async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown-org', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("devrait déclencher une exception ForbiddenException si l'utilisateur n'est pas membre", async () => {
      // 💡 Variante de fakeOrg sans membres → l'utilisateur n'est pas membre
      const orgNoMembers: OrgWithMembers = { ...fakeOrg, members: [] };
      prisma.organization.findUnique.mockResolvedValue(orgNoMembers);

      await expect(service.findOne('org-123', 'user-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── inviteMember() ───────────────────────────────────────────────────────────

  /**
   * inviteMember()
   *
   * Crée une invitation et émet un événement pour l'envoi de l'email.
   *
   * 🔐 Règle métier :
   *    - Seuls les membres avec le rôle OWNER ou ADMIN peuvent inviter
   *    - Un membre avec le rôle MEMBER → ForbiddenException
   *
   * ⚙️ Événement émis : 'organization.invitation'
   *    Contient : email, organizationName, token, expiresAt
   */
  describe('inviteMember()', () => {
    it('devrait créer une invitation et déclencher un événement', async () => {
      prisma.organization.findUnique.mockResolvedValue(fakeOrg);
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(fakeInvitation);

      const result = await service.inviteMember('org-123', 'user-123', {
        email: 'colleague@example.com',
      });

      expect(result).toHaveProperty('key', 'organizations.invitation_sent');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'organization.invitation',
        expect.objectContaining({ email: 'colleague@example.com' }),
      );
    });

    it("doit lever une exception ForbiddenException si l'utilisateur n'est ni PROPRIÉTAIRE ni ADMIN", async () => {
      // 💡 Variante de fakeOrg avec un membre MEMBER → pas assez de droits
      const orgWithMember: OrgWithMembers = {
        ...fakeOrg,
        members: [{ ...fakeOrg.members[0], role: MemberRole.MEMBER }],
      };
      prisma.organization.findUnique.mockResolvedValue(orgWithMember);

      await expect(
        service.inviteMember('org-123', 'user-123', {
          email: 'colleague@example.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── acceptInvitation() ───────────────────────────────────────────────────────

  /**
   * acceptInvitation()
   *
   * Accepte une invitation via son token et ajoute l'utilisateur comme membre.
   *
   * 🔐 Règles métier :
   *    - Token invalide/inexistant  → ForbiddenException
   *    - Invitation expirée         → ForbiddenException
   *    - Invitation déjà acceptée   → ForbiddenException
   *
   * ⚙️ Si l'utilisateur est déjà membre → on skip la création (idempotent)
   */
  describe('acceptInvitation()', () => {
    it("devrait accepter l'invitation et ajouter l'utilisateur en tant que membre", async () => {
      prisma.invitation.findUnique.mockResolvedValue(fakeInvitation);
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      prisma.organizationMember.create.mockResolvedValue(fakeOrg.members[0]);
      prisma.invitation.update.mockResolvedValue({
        ...fakeInvitation,
        acceptedAt: NOW,
      });

      const result = await service.acceptInvitation('invite-token', 'user-123');

      expect(result).toHaveProperty('key', 'organizations.invitation_accepted');
      expect(prisma.organizationMember.create).toHaveBeenCalledTimes(1);
    });

    it("devrait lever une exception si l'invitation est expirée", async () => {
      // 💡 expiresAt dans le passé → invitation expirée
      const expiredInvitation: Invitation = {
        ...fakeInvitation,
        expiresAt: new Date(Date.now() - 1000),
      };
      prisma.invitation.findUnique.mockResolvedValue(expiredInvitation);

      await expect(
        service.acceptInvitation('invite-token', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it("devrait lever une exception si l'invitation a déjà été acceptée", async () => {
      // 💡 acceptedAt non null → invitation déjà traitée
      const acceptedInvitation: Invitation = {
        ...fakeInvitation,
        acceptedAt: NOW,
      };
      prisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);

      await expect(
        service.acceptInvitation('invite-token', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
