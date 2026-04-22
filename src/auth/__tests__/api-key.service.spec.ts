/**
 * ============================================================
 * FICHIER DE TESTS — ApiKeyService
 * ============================================================
 *
 * Ce fichier contient les tests unitaires du service ApiKeyService.
 *
 * 💡 C'est quoi un test unitaire ?
 *    Un test unitaire vérifie qu'une fonction précise fait bien
 *    ce qu'elle est censée faire, de manière isolée — sans
 *    toucher à la vraie base de données ni aux vrais services.
 *
 * 🧰 Outils utilisés :
 *    - Jest      → le framework de tests (describe, it, expect...)
 *    - NestJS Testing → permet de créer un module de test isolé
 *    - bcryptjs  → pour hasher/comparer les clés API
 *
 * 📋 Fonctions testées :
 *    - create()         → créer une nouvelle clé API
 *    - findAllByUser()  → lister les clés d'un utilisateur
 *    - revoke()         → révoquer (désactiver) une clé
 *    - validate()       → vérifier qu'une clé est valide
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from '../api-key.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import * as bcrypt from 'bcryptjs';

/**
 * 🗄️ FAUX SERVICE PRISMA (mock)
 *
 * On ne veut pas utiliser la vraie base de données dans les tests.
 * On crée donc un "faux" PrismaService qui simule les opérations
 * sur la table `apiKey` avec des fonctions Jest (jest.fn()).
 *
 * jest.fn() = une fonction vide que l'on peut programmer
 * pour retourner ce que l'on veut dans chaque test.
 */
const mockPrismaService = {
  apiKey: {
    findUnique: jest.fn(), // simule la recherche d'une clé par son id
    findMany: jest.fn(), // simule la recherche de plusieurs clés
    create: jest.fn(), // simule la création d'une clé
    update: jest.fn(), // simule la mise à jour d'une clé
  },
};

/**
 * 🔐 MOCK DE BCRYPTJS
 *
 * bcryptjs est la librairie qui hash (chiffre) les mots de passe
 * et les clés API. Dans les tests, on remplace ses fonctions réelles
 * par des fonctions Jest contrôlables.
 *
 * jest.requireActual() → garde les vraies fonctions non mockées
 * on ne remplace que compare() et hash() car ce sont les seules
 * utilisées dans ApiKeyService.
 */
jest.mock('bcryptjs', () => {
  const actual = jest.requireActual<typeof import('bcryptjs')>('bcryptjs');
  return {
    ...actual,
    compare: jest.fn(), // simule la comparaison clé brute / clé hashée
    hash: jest.fn(), // simule le hashage d'une clé
  };
});

/**
 * 🌐 FAUX SERVICE I18N (mock)
 *
 * I18nService gère les traductions (français, anglais...).
 * Dans les tests, on simule ses méthodes pour qu'elles retournent
 * simplement la clé de traduction — pas besoin de la vraie traduction.
 *
 * Exemple : translate('auth.api_key_revoked') → 'auth.api_key_revoked'
 */
const mockI18nService = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string) => ({ key, message: key })),
};

/**
 * 🧪 SUITE DE TESTS PRINCIPALE — ApiKeyService
 *
 * describe() regroupe tous les tests liés à un même sujet.
 * Ici on regroupe tous les tests de ApiKeyService.
 */
describe('ApiKeyService', () => {
  let service: ApiKeyService; // le vrai service qu'on teste
  let prisma: typeof mockPrismaService; // le faux Prisma pour vérifier les appels

  /**
   * ⚙️ CONFIGURATION AVANT CHAQUE TEST
   *
   * beforeEach() s'exécute automatiquement avant chaque test (it()).
   * Il recrée un module NestJS isolé avec les vrais et faux services,
   * puis réinitialise tous les mocks pour éviter les interférences
   * entre les tests.
   */
  beforeEach(async () => {
    // Création d'un module NestJS de test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService, // le vrai service
        { provide: PrismaService, useValue: mockPrismaService }, // faux Prisma
        { provide: I18nService, useValue: mockI18nService }, // faux i18n
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks(); // remet tous les mocks à zéro entre les tests

    // Par défaut, bcrypt.compare retourne false (clé invalide)
    // Chaque test peut surcharger ce comportement si besoin
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  });

  // ══════════════════════════════════════════════════════════
  // 📌 create() — Créer une clé API
  // ══════════════════════════════════════════════════════════

  describe('create()', () => {
    /**
     * ✅ Test 1 : La clé brute (rawKey) est bien retournée une seule fois
     *
     * Quand on crée une clé API, le service doit retourner la clé
     * en clair (rawKey) UNE SEULE FOIS — juste après la création.
     * Ensuite elle ne sera plus jamais accessible car stockée hashée.
     */
    it('devrait créer une clé API et la retourner une seule fois', async () => {
      // On programme le faux Prisma pour simuler une création réussie
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

      // La réponse doit contenir rawKey (clé en clair) et key (clé masquée)
      expect(result).toHaveProperty('rawKey');
      expect(result).toHaveProperty('key');
      // La clé brute doit commencer par "sk_" (convention du projet)
      expect(result.rawKey).toMatch(/^sk_/);
    });

    /**
     * ✅ Test 2 : La clé est bien hashée avant d'être sauvegardée
     *
     * La clé brute (rawKey) ne doit JAMAIS être stockée telle quelle
     * en base de données — seulement sa version hashée.
     * On vérifie aussi que la version affichée est masquée (sk_****...).
     */
    it('devrait hasher la clé avant de la sauvegarder', async () => {
      prisma.apiKey.create.mockImplementation(
        (args: { data: { key: string } }) => ({
          id: 'uuid-123',
          name: 'Production API',
          key: args.data.key, // retourne la clé telle que reçue
          userId: 'user-123',
          isActive: true,
          expiresAt: null,
          createdAt: new Date(),
        }),
      );

      const result = await service.create('user-123', {
        name: 'Production API',
      });

      expect(result.rawKey).toMatch(/^sk_/); // rawKey commence par sk_
      expect(result.rawKey).not.toBe(result.key); // rawKey ≠ clé masquée
      expect(result.key).toMatch(/^sk_\*{4}/); // clé masquée → sk_****...
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 findAllByUser() — Lister les clés d'un utilisateur
  // ══════════════════════════════════════════════════════════

  describe('findAllByUser()', () => {
    /**
     * ✅ Test : La liste ne contient pas la clé brute
     *
     * Quand on liste les clés d'un utilisateur, la clé brute (key)
     * ne doit pas apparaître — c'est une donnée sensible.
     * On retourne uniquement les métadonnées (nom, statut, dates...).
     */
    it('devrait retourner la liste des clés API sans la clé brute', async () => {
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

      expect(Array.isArray(result)).toBe(true); // doit être un tableau
      expect(result[0]).not.toHaveProperty('key'); // pas de clé brute !
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 revoke() — Révoquer une clé API
  // ══════════════════════════════════════════════════════════

  describe('revoke()', () => {
    /**
     * ✅ Test : La révocation retourne un message de confirmation
     *
     * Révoquer = désactiver une clé (isActive → false).
     * Le service doit retourner un message i18n confirmant l'action.
     */
    it('devrait révoquer une clé API', async () => {
      prisma.apiKey.update.mockResolvedValue({
        id: 'uuid-123',
        isActive: false,
      });

      const result = await service.revoke('uuid-123', 'user-123');

      // Le message retourné doit contenir la clé de traduction
      expect(result).toHaveProperty('key', 'auth.api_key_revoked');
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 validate() — Vérifier qu'une clé API est valide
  // ══════════════════════════════════════════════════════════

  describe('validate()', () => {
    /**
     * ✅ Test 1 : Clé valide → retourne l'utilisateur
     *
     * Si la clé existe, est active, non expirée et correspond
     * au hash en base → on retourne l'utilisateur associé.
     */
    it("devrait retourner l'utilisateur quand la clé API est valide", async () => {
      const rawKey = 'sk_testkey123456';

      prisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'uuid-123',
          key: rawKey,
          isActive: true,
          expiresAt: null, // pas d'expiration
          user: {
            id: 'user-123',
            email: 'phanuel@example.com',
            status: 'ACTIVE',
          },
        },
      ]);

      // On simule que bcrypt confirme que la clé correspond au hash
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validate(rawKey);
      expect(result).not.toBeNull(); // un utilisateur est retourné
      expect(result).toHaveProperty('email'); // l'utilisateur a un email
    });

    /**
     * ✅ Test 2 : Clé inexistante → retourne null
     *
     * Si aucune clé n'est trouvée en base, on retourne null.
     * L'authentification sera refusée.
     */
    it("devrait retourner null quand la clé API n'existe pas", async () => {
      prisma.apiKey.findMany.mockResolvedValue([]); // base vide

      const result = await service.validate('sk_invalid');
      expect(result).toBeNull();
    });

    /**
     * ✅ Test 3 : Clé révoquée → retourne null
     *
     * Une clé révoquée (isActive = false) ne doit plus
     * permettre l'authentification.
     */
    it('devrait retourner null quand la clé API est révoquée', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]); // aucune clé active trouvée

      const result = await service.validate('sk_testkey');
      expect(result).toBeNull();
    });

    /**
     * ✅ Test 4 : Clé expirée → retourne null
     *
     * Une clé peut avoir une date d'expiration (expiresAt).
     * Si cette date est dépassée, la clé doit être rejetée
     * même si elle est techniquement valide (hash correct).
     *
     * new Date(Date.now() - 1000) = une date dans le passé (il y a 1 seconde)
     */
    it('devrait retourner null quand la clé API est expirée', async () => {
      prisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'uuid-123',
          key: 'sk_hashed',
          isActive: true,
          expiresAt: new Date(Date.now() - 1000), // expirée il y a 1 seconde
          user: { id: 'user-123', email: 'phanuel@example.com' },
        },
      ]);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validate('sk_testkey');
      expect(result).toBeNull(); // rejetée malgré le hash correct
    });
  });
});
