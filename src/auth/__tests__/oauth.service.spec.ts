/**
 * ============================================================
 * FICHIER DE TESTS — OAuthService
 * ============================================================
 *
 * Ce fichier contient les tests unitaires du service OAuthService.
 * Ce service gère la connexion via des fournisseurs externes
 * comme Google ou Apple (OAuth 2.0).
 *
 * 💡 C'est quoi OAuth ?
 *    OAuth est un protocole qui permet à un utilisateur de se
 *    connecter à votre application via un compte tiers (Google,
 *    Apple, GitHub...) sans créer de mot de passe supplémentaire.
 *    Google authentifie l'utilisateur et transmet ses infos à
 *    votre application.
 *
 * 📋 Fonction testée :
 *    - handleGoogleLogin() → gérer la connexion/inscription via Google
 *
 * 🔀 Les 3 cas possibles lors d'une connexion Google :
 *    1. Nouvel utilisateur  → créer le compte + lier Google
 *    2. Compte OAuth connu  → connexion directe
 *    3. Email déjà existant → lier Google au compte existant
 * ============================================================
 */

import { AuthService } from '../auth.service';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OAuthService } from '../oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';

/**
 * 🗄️ FAUX SERVICE PRISMA (mock)
 *
 * On simule trois tables ici :
 * - user         → les utilisateurs de l'application
 * - oAuthAccount → les liens entre un utilisateur et son compte Google/Apple
 * - refreshToken → les tokens de rafraîchissement JWT
 */
const mockPrismaService = {
  user: {
    findUnique: jest.fn(), // chercher un utilisateur (par email ou id)
    create: jest.fn(), // créer un nouvel utilisateur
    update: jest.fn(), // mettre à jour un utilisateur
  },
  oAuthAccount: {
    findUnique: jest.fn(), // chercher un lien OAuth existant
    create: jest.fn(), // créer un nouveau lien OAuth
  },
  refreshToken: {
    create: jest.fn(), // sauvegarder un refresh token
  },
};

/**
 * 🌐 FAUX SERVICE I18N (mock)
 * Retourne simplement la clé de traduction.
 */
const mockI18nService = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string) => ({ key, message: key })),
};

/**
 * 🎫 FAUX SERVICE JWT (mock)
 * Simule la génération des tokens d'accès et de rafraîchissement.
 */
const mockJwtService = {
  signAsync: jest.fn(),
};

/**
 * 📢 FAUX EVENT EMITTER (mock)
 * Simule l'émission d'événements (ex: envoi d'email de bienvenue).
 */
const mockEventEmitter = {
  emit: jest.fn(),
};

/**
 * 🔐 FAUX AUTH SERVICE (mock)
 *
 * OAuthService délègue la génération des tokens à AuthService.
 * On mocke les deux méthodes utilisées pour éviter
 * de dépendre de l'implémentation réelle de AuthService.
 */
const mockAuthService = {
  generateTokens: jest.fn(), // génère access + refresh token
  saveRefreshToken: jest.fn(), // sauvegarde le refresh token en base
};

/**
 * 🧪 SUITE DE TESTS PRINCIPALE — OAuthService
 */
describe('OAuthService', () => {
  let service: OAuthService;
  let prisma: typeof mockPrismaService;

  /**
   * ⚙️ CONFIGURATION AVANT CHAQUE TEST
   *
   * Recrée un module NestJS isolé avec tous les vrais
   * et faux services, puis réinitialise les mocks.
   */
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
    prisma = module.get<PrismaService>(
      PrismaService,
    ) as unknown as typeof mockPrismaService;

    jest.clearAllMocks(); // remet tous les mocks à zéro entre chaque test
  });

  /**
   * 👤 PROFIL GOOGLE FICTIF
   *
   * Ces données représentent ce que Google transmet à votre
   * application après qu'un utilisateur s'est authentifié.
   * C'est le profil que handleGoogleLogin() reçoit en paramètre.
   */
  const googleUser = {
    providerId: 'google-123', // identifiant unique Google
    email: 'phanuel@gmail.com',
    firstName: 'Phanuel',
    lastName: 'Tsopze',
    photo: 'https://photo.url', // photo de profil Google
  };

  // ══════════════════════════════════════════════════════════
  // 📌 handleGoogleLogin() — Connexion / Inscription via Google
  // ══════════════════════════════════════════════════════════

  describe('handleGoogleLogin()', () => {
    /**
     * ✅ Test 1 : Nouvel utilisateur → compte créé + tokens retournés
     *
     * 🔀 Cas n°1 : L'email Google n'existe pas encore dans l'application
     *    et aucun lien OAuth n'existe pour ce providerId Google.
     *
     * Comportement attendu :
     * - Un nouvel utilisateur est créé en base (prisma.user.create)
     * - Un lien OAuth est créé entre l'utilisateur et Google
     * - Le compte est directement ACTIVE (pas besoin de vérifier l'email
     *   car Google l'a déjà vérifié)
     * - Les tokens JWT sont générés et retournés
     */
    it("devrait créer un nouvel utilisateur s'il n'existe pas et retourner les tokens", async () => {
      // Aucun lien OAuth existant pour ce compte Google
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      // Aucun utilisateur avec cet email
      prisma.user.findUnique.mockResolvedValue(null);
      // Simulation de la création de l'utilisateur
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        status: 'ACTIVE', // actif immédiatement car email vérifié par Google
        emailVerified: true, // Google garantit que l'email est valide
      });
      prisma.oAuthAccount.create.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      // Le JWT génère d'abord l'access token puis le refresh token
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.handleGoogleLogin(googleUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.user.create).toHaveBeenCalledTimes(1); // créé une seule fois
    });

    /**
     * ✅ Test 2 : Compte OAuth déjà lié → connexion directe
     *
     * 🔀 Cas n°2 : L'utilisateur s'est déjà connecté via Google
     *    dans le passé — le lien OAuth existe déjà en base.
     *
     * Comportement attendu :
     * - On retrouve l'utilisateur via le lien OAuth (oAuthAccount)
     * - Aucun nouveau compte n'est créé (prisma.user.create pas appelé)
     * - Les tokens JWT sont générés et retournés directement
     */
    it('devrait connecter un utilisateur existant avec un compte OAuth', async () => {
      // Le lien OAuth existe déjà → on retrouve l'utilisateur directement
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth-123',
        userId: 'uuid-123',
        provider: 'GOOGLE',
        providerId: googleUser.providerId,
        user: {
          // l'utilisateur lié à ce compte Google
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
      // Aucun nouveau compte créé — l'utilisateur existait déjà
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    /**
     * ✅ Test 3 : Email déjà utilisé → liaison du compte Google
     *
     * 🔀 Cas n°3 : L'utilisateur possède déjà un compte créé manuellement
     *    (email + mot de passe) avec le même email que son compte Google.
     *
     * Comportement attendu :
     * - Aucun lien OAuth n'existe pour ce providerId Google
     * - Mais un compte avec cet email existe déjà
     * - On NE crée PAS un second compte utilisateur
     * - On crée un lien OAuth pour connecter Google au compte existant
     * - Les tokens JWT sont générés et retournés
     *
     * 💡 C'est le cas typique : "J'avais un compte classique,
     *    je me connecte avec Google pour la première fois."
     */
    it('devrait lier le compte OAuth à un compte existant avec le même email', async () => {
      // Pas encore de lien OAuth pour ce compte Google
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      // Mais un compte avec cet email existe déjà
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: googleUser.email,
        status: 'ACTIVE',
        emailVerified: true,
      });
      // On crée le lien OAuth (pas un nouveau user)
      prisma.oAuthAccount.create.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.handleGoogleLogin(googleUser);

      expect(result).toHaveProperty('accessToken');
      // Le lien OAuth a bien été créé
      expect(prisma.oAuthAccount.create).toHaveBeenCalledTimes(1);
      // Aucun nouveau compte utilisateur créé
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
