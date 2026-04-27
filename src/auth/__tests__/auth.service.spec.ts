/**
 * ============================================================
 * FICHIER DE TESTS — AuthService
 * ============================================================
 *
 * Ce fichier contient les tests unitaires du service AuthService.
 * C'est le service principal d'authentification de l'application.
 *
 * 💡 Rappel : un test unitaire vérifie qu'une fonction précise
 *    fait bien ce qu'elle est censée faire, de manière isolée —
 *    sans toucher à la vraie base de données ni aux vrais services.
 *
 * 🧰 Outils utilisés :
 *    - Jest           → framework de tests
 *    - NestJS Testing → création d'un module de test isolé
 *    - bcryptjs       → hashage/comparaison des mots de passe
 *    - EventEmitter2  → système d'événements (envoi d'emails...)
 *
 * 📋 Fonctions testées :
 *    - signup()         → inscription d'un nouvel utilisateur
 *    - login()          → connexion avec email + mot de passe
 *    - refreshToken()   → renouveler les tokens d'accès
 *    - verifyOtp()      → vérifier le code OTP reçu par email
 *    - forgotPassword() → demande de réinitialisation de mot de passe
 *    - resetPassword()  → définir un nouveau mot de passe
 *    - setup2FA()       → configurer la double authentification
 *    - enable2FA()      → activer la double authentification
 *    - disable2FA()     → désactiver la double authentification
 *    - verify2FA()      → vérifier le code de double authentification
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import * as bcrypt from 'bcryptjs';
import { TwoFactorService } from '../two-factor.service';

/**
 * 🔑 FAUX SERVICE 2FA (mock)
 *
 * TwoFactorService gère la double authentification (Google Authenticator).
 * On simule ses méthodes pour éviter de dépendre de la vraie
 * génération de QR codes et de secrets TOTP dans les tests.
 */
const mockTwoFactorService = {
  setup: jest.fn().mockResolvedValue({
    secret: 'JBSWY3DPEHPK3PXP', // secret partagé avec l'app d'auth
    otpauthUrl: 'otpauth://totp/...', // URL pour scanner le QR code
    qrCode: 'data:image/png;base64,...', // image QR code en base64
  }),
  enable: jest.fn().mockResolvedValue({
    key: 'auth.2fa_enabled',
    message: 'auth.2fa_enabled',
  }),
  disable: jest.fn().mockResolvedValue({
    key: 'auth.2fa_disabled',
    message: 'auth.2fa_disabled',
  }),
  verify: jest.fn().mockResolvedValue(true), // par défaut le code 2FA est valide
};

/**
 * 🗄️ FAUX SERVICE PRISMA (mock)
 *
 * Simule les opérations sur deux tables :
 * - user         → gestion des utilisateurs
 * - refreshToken → gestion des tokens de rafraîchissement
 */
const mockPrismaService = {
  user: {
    findUnique: jest.fn(), // chercher un utilisateur
    create: jest.fn(), // créer un utilisateur
    update: jest.fn(), // mettre à jour un utilisateur
  },
  refreshToken: {
    create: jest.fn(), // sauvegarder un refresh token
    findUnique: jest.fn(), // retrouver un refresh token
    update: jest.fn(), // révoquer un refresh token
  },
};

/**
 * 🌐 FAUX SERVICE I18N (mock)
 *
 * Simule les traductions — retourne simplement la clé
 * de traduction au lieu du texte traduit.
 */
const mockI18nService = {
  translate: jest.fn((key: string) => key),
  createResponse: jest.fn((key: string) => ({ key, message: key })),
};

/**
 * 🎫 FAUX SERVICE JWT (mock)
 *
 * JwtService génère et vérifie les tokens d'authentification.
 * - signAsync()   → génère un access token ou refresh token
 * - verifyAsync() → vérifie qu'un token est valide
 */
const mockJwtService = {
  // ✅ cast `as jest.Mock` au lieu de jest.fn<any>()
  // jest.fn() sans générique est correct, le cast donne accès à mockResolvedValueOnce
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};
/**
 * 📢 FAUX EVENT EMITTER (mock)
 *
 * EventEmitter2 permet d'émettre des événements dans l'application.
 * Par exemple : après une inscription, on émet 'user.created'
 * pour déclencher l'envoi d'un email de confirmation.
 *
 * On mocke emit() pour vérifier qu'il est bien appelé
 * sans envoyer de vrais emails dans les tests.
 */
const mockEventEmitter = {
  emit: jest.fn(),
};

/**
 * 🧪 SUITE DE TESTS PRINCIPALE — AuthService
 */
describe('AuthService', () => {
  let service: AuthService;
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
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks(); // remet tous les mocks à zéro entre chaque test
  });

  // ══════════════════════════════════════════════════════════
  // 📌 signup() — Inscription d'un nouvel utilisateur
  // ══════════════════════════════════════════════════════════

  describe('signup()', () => {
    /**
     * 📦 Données de test réutilisées dans tous les tests signup()
     * On définit un DTO (Data Transfer Object) fictif une seule fois.
     */
    const signupDto = {
      email: 'phanuel@example.com',
      password: 'SecurePass123!',
      firstName: 'Phanuel',
      lastName: 'Tsopze',
    };

    /**
     * ✅ Test 1 : Inscription réussie
     *
     * Cas nominal : l'email n'existe pas encore,
     * l'utilisateur est créé et un message de succès est retourné.
     */
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // email non utilisé
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        status: 'PENDING', // compte en attente de vérification email
        emailVerified: false,
        createdAt: new Date(),
      });

      const result = await service.signup(signupDto);

      expect(result).toHaveProperty('key', 'auth.signup_success');
      expect(prisma.user.create).toHaveBeenCalledTimes(1); // créé une seule fois
    });

    /**
     * ✅ Test 2 : Le mot de passe est hashé avant sauvegarde
     *
     * Le mot de passe en clair ne doit JAMAIS être stocké
     * en base de données — seulement sa version hashée (bcrypt).
     * On inspecte les arguments passés à prisma.user.create pour vérifier.
     */
    it('devrait hasher le mot de passe avant de le sauvegarder', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-123',
        email: signupDto.email,
        status: 'PENDING',
        emailVerified: false,
        createdAt: new Date(),
      });

      await service.signup(signupDto);

      // On récupère les arguments passés à prisma.user.create
      const createCalls = prisma.user.create.mock.calls as Array<
        [{ data: { password: string } }]
      >;
      const hashedPassword: string = createCalls[0][0].data.password;

      // Le hash ne doit pas être le mot de passe en clair
      expect(hashedPassword).not.toBe(signupDto.password);
      // Mais bcrypt.compare doit confirmer que c'est bien le même mot de passe
      expect(await bcrypt.compare(signupDto.password, hashedPassword)).toBe(
        true,
      );
    });

    /**
     * ✅ Test 3 : Email déjà utilisé → ConflictException
     *
     * Si l'email existe déjà en base, le service doit refuser
     * l'inscription avec une erreur 409 Conflict.
     * prisma.user.create ne doit pas être appelé.
     */
    it("devrait lever une ConflictException si l'email existe déjà", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-uuid',
        email: signupDto.email, // email déjà pris
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    /**
     * ✅ Test 4 : Le mot de passe n'est pas retourné dans la réponse
     *
     * Par sécurité, le mot de passe (même hashé) ne doit
     * jamais être inclus dans la réponse envoyée au client.
     */
    it('ne devrait pas retourner le mot de passe dans la réponse', async () => {
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

    /**
     * ✅ Test 5 : L'événement 'user.created' est émis après l'inscription
     *
     * Après inscription, le service émet un événement contenant
     * l'email et un OTP (code à 6 chiffres) pour vérifier l'adresse email.
     * Cet événement déclenchera l'envoi d'un email de confirmation.
     *
     * /^\d{6}$/ = expression régulière qui vérifie que l'OTP
     *             est exactement 6 chiffres.
     */
    it("devrait émettre l'événement user.created avec un OTP après l'inscription", async () => {
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
        expect.objectContaining({
          email: signupDto.email,
          otp: expect.stringMatching(/^\d{6}$/) as string, // OTP = 6 chiffres
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 login() — Connexion avec email + mot de passe
  // ══════════════════════════════════════════════════════════

  describe('login()', () => {
    const loginDto = {
      email: 'phanuel@example.com',
      password: 'SecurePass123!',
    };

    /**
     * 👤 Utilisateur fictif réutilisé dans tous les tests login()
     * Le mot de passe est pré-hashé pour simuler ce qui est en base.
     */
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

    /**
     * ✅ Test 1 : Connexion réussie → tokens retournés
     *
     * Cas nominal : email + mot de passe corrects, compte actif.
     * Le service doit retourner un accessToken et un refreshToken.
     *
     * mockResolvedValueOnce() → retourne une valeur différente
     * à chaque appel successif de signAsync().
     */
    it("devrait retourner les tokens d'accès et de rafraîchissement en cas de succès", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({});
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-mock')
        .mockResolvedValueOnce('refresh-token-mock');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('key', 'auth.login_success');
    }, 15000);

    /**
     * ✅ Test 2 : Utilisateur inexistant → UnauthorizedException
     *
     * Si l'email n'est pas trouvé en base, on refuse la connexion.
     * On ne doit jamais préciser si c'est l'email ou le mot de passe
     * qui est incorrect (sécurité contre l'énumération d'utilisateurs).
     */
    it("devrait lever une UnauthorizedException si l'utilisateur n'existe pas", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    /**
     * ✅ Test 3 : Mauvais mot de passe → UnauthorizedException
     *
     * Le mot de passe fourni ne correspond pas au hash en base.
     */
    it('devrait lever une UnauthorizedException si le mot de passe est incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: bcrypt.hashSync('WrongPassword!', 10),
      });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    /**
     * ✅ Test 4 : Compte en attente → UnauthorizedException
     *
     * Un compte PENDING = email pas encore vérifié.
     * L'utilisateur doit d'abord valider son email avant de se connecter.
     */
    it('devrait lever une UnauthorizedException si le compte est en attente (PENDING)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'PENDING',
        emailVerified: false,
      });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    /**
     * ✅ Test 5 : Compte suspendu → UnauthorizedException
     *
     * Un compte SUSPENDED = bloqué par un administrateur.
     * La connexion doit être refusée même avec les bons identifiants.
     */
    it('devrait lever une UnauthorizedException si le compte est suspendu (SUSPENDED)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 refreshToken() — Renouveler les tokens d'accès
  // ══════════════════════════════════════════════════════════

  describe('refreshToken()', () => {
    /**
     * ✅ Test 1 : Refresh token valide → nouveaux tokens
     *
     * Le refresh token existe, n'est pas révoqué et n'est pas expiré.
     * Le service doit générer et retourner de nouveaux tokens.
     *
     * Date.now() + 7 * 24 * 60 * 60 * 1000 = dans 7 jours (en ms)
     */
    it('devrait retourner de nouveaux tokens quand le refresh token est valide', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-uuid',
        token: 'valid-refresh-token',
        userId: 'uuid-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expire dans 7 jours
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

    /**
     * ✅ Test 2 : Token révoqué → UnauthorizedException
     *
     * Un token révoqué = l'utilisateur s'est déconnecté ou
     * un admin a invalidé sa session. La rotation est refusée.
     */
    it('devrait lever une UnauthorizedException si le token est révoqué', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-uuid',
        token: 'revoked-token',
        isRevoked: true, // token explicitement révoqué
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await expect(service.refreshToken('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    /**
     * ✅ Test 3 : Token expiré → UnauthorizedException
     *
     * Date.now() - 1000 = il y a 1 seconde → token expiré.
     * L'utilisateur doit se reconnecter manuellement.
     */
    it('devrait lever une UnauthorizedException si le token est expiré', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-uuid',
        token: 'expired-token',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // expiré il y a 1 seconde
      });
      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    /**
     * ✅ Test 4 : Token introuvable → UnauthorizedException
     *
     * Le token n'existe pas du tout en base de données.
     */
    it('devrait lever une UnauthorizedException si le token est introuvable', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshToken('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 verifyOtp() — Vérifier le code OTP reçu par email
  // ══════════════════════════════════════════════════════════

  describe('verifyOtp()', () => {
    /**
     * ✅ Test 1 : OTP valide → compte activé
     *
     * Quand l'OTP est correct et non expiré, le compte passe
     * de PENDING à ACTIVE et l'email est marqué comme vérifié.
     * L'OTP est ensuite effacé de la base (otpCode: null).
     *
     * Date.now() + 10 * 60 * 1000 = expire dans 10 minutes
     */
    it("devrait activer le compte quand l'OTP est valide", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        otpCode: '847392',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // valide 10 min
        emailVerified: false,
        status: 'PENDING',
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyOtp({
        email: 'phanuel@example.com',
        otp: '847392',
      });

      expect(result).toHaveProperty('key', 'auth.otp_verified');
      // On vérifie que la mise à jour en base contient bien les bons champs
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: true, // email confirmé
            status: 'ACTIVE', // compte activé
            otpCode: null, // OTP effacé
            otpExpiresAt: null, // expiration effacée
          }) as object,
        }) as object,
      );
    });

    /**
     * ✅ Test 2 : OTP incorrect → UnauthorizedException
     *
     * Le code saisi ('000000') ne correspond pas
     * au code en base ('847392').
     */
    it("devrait lever une UnauthorizedException si l'OTP est incorrect", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        otpCode: '847392',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        emailVerified: false,
        status: 'PENDING',
      });

      await expect(
        service.verifyOtp({ email: 'phanuel@example.com', otp: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    /**
     * ✅ Test 3 : OTP expiré → UnauthorizedException
     *
     * Le code est correct mais sa durée de validité est dépassée.
     * L'utilisateur devra en demander un nouveau.
     */
    it("devrait lever une UnauthorizedException si l'OTP est expiré", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        otpCode: '847392',
        otpExpiresAt: new Date(Date.now() - 1000), // expiré il y a 1 seconde
        emailVerified: false,
        status: 'PENDING',
      });

      await expect(
        service.verifyOtp({ email: 'phanuel@example.com', otp: '847392' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    /**
     * ✅ Test 4 : Utilisateur introuvable → UnauthorizedException
     */
    it("devrait lever une UnauthorizedException si l'utilisateur est introuvable", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ email: 'unknown@example.com', otp: '847392' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 forgotPassword() — Demande de réinitialisation
  // ══════════════════════════════════════════════════════════

  describe('forgotPassword()', () => {
    /**
     * ✅ Test 1 : Utilisateur trouvé → événement émis
     *
     * Quand l'email existe, le service génère un OTP,
     * le sauvegarde et émet l'événement 'password.reset'
     * pour déclencher l'envoi d'un email.
     */
    it("devrait émettre l'événement password.reset quand l'utilisateur existe", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        firstName: 'Phanuel',
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword('phanuel@example.com');

      expect(result).toHaveProperty('key', 'auth.password_reset_sent');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'password.reset',
        expect.objectContaining({
          email: 'phanuel@example.com',
          otp: expect.stringMatching(/^\d{6}$/) as string,
        }),
      );
    });

    /**
     * ✅ Test 2 : Email inexistant → même réponse (sécurité)
     *
     * 🛡️ Bonne pratique de sécurité : on retourne TOUJOURS
     * le même message, que l'email existe ou non.
     * Cela empêche un attaquant de deviner quels emails
     * sont enregistrés dans l'application (énumération).
     * L'événement ne doit PAS être émis dans ce cas.
     */
    it("devrait retourner la même réponse même si l'utilisateur n'existe pas (sécurité)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('unknown@example.com');

      expect(result).toHaveProperty('key', 'auth.password_reset_sent');
      expect(mockEventEmitter.emit).not.toHaveBeenCalled(); // pas d'email envoyé
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 resetPassword() — Définir un nouveau mot de passe
  // ══════════════════════════════════════════════════════════

  describe('resetPassword()', () => {
    /**
     * ✅ Test 1 : OTP valide → mot de passe réinitialisé
     *
     * Le nouveau mot de passe est hashé et sauvegardé.
     * L'OTP est effacé après utilisation (usage unique).
     */
    it("devrait réinitialiser le mot de passe quand l'OTP est valide", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.resetPassword({
        email: 'phanuel@example.com',
        otp: '123456',
        newPassword: 'NewSecurePass123!',
      });

      expect(result).toHaveProperty('key', 'auth.password_reset_success');
      // L'OTP doit être effacé après utilisation
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            otpCode: null, // OTP effacé
            otpExpiresAt: null, // expiration effacée
          }) as object,
        }) as object,
      );
    });

    /**
     * ✅ Test 2 : OTP invalide → UnauthorizedException
     */
    it("devrait lever une UnauthorizedException si l'OTP est invalide", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await expect(
        service.resetPassword({
          email: 'phanuel@example.com',
          otp: '000000', // mauvais code
          newPassword: 'NewSecurePass123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    /**
     * ✅ Test 3 : OTP expiré → UnauthorizedException
     */
    it("devrait lever une UnauthorizedException si l'OTP est expiré", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() - 1000), // expiré
      });

      await expect(
        service.resetPassword({
          email: 'phanuel@example.com',
          otp: '123456',
          newPassword: 'NewSecurePass123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 setup2FA() — Configurer la double authentification
  // ══════════════════════════════════════════════════════════

  describe('setup2FA()', () => {
    /**
     * ✅ Test 1 : Configuration réussie → QR code et secret retournés
     *
     * Le service doit retourner :
     * - secret     → la clé secrète à stocker côté serveur
     * - otpauthUrl → l'URL à encoder dans le QR code
     * - qrCode     → l'image QR code en base64 à afficher à l'utilisateur
     */
    it("devrait retourner l'URL otpauth et le QR code", async () => {
      mockTwoFactorService.setup.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/nestjs-saas-starter:phanuel@example.com',
        qrCode: 'data:image/png;base64,abc123',
      });

      const result = await service.setup2FA('uuid-123');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpauthUrl');
    });

    /**
     * ✅ Test 2 : Utilisateur introuvable → UnauthorizedException
     */
    it("devrait lever une exception si l'utilisateur est introuvable", async () => {
      mockTwoFactorService.setup.mockRejectedValue(new UnauthorizedException());
      await expect(service.setup2FA('unknown-uuid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 enable2FA() — Activer la double authentification
  // ══════════════════════════════════════════════════════════

  describe('enable2FA()', () => {
    /**
     * ✅ Test 1 : Code valide → 2FA activé
     *
     * L'utilisateur scanne le QR code avec Google Authenticator
     * et saisit le code généré pour confirmer l'activation.
     */
    it('devrait activer le 2FA quand le code est valide', async () => {
      mockTwoFactorService.enable.mockResolvedValue({
        key: 'auth.2fa_enabled',
        message: 'auth.2fa_enabled',
      });

      const result = await service.enable2FA('uuid-123', '847392');
      expect(result).toHaveProperty('key', 'auth.2fa_enabled');
    });

    /**
     * ✅ Test 2 : Code invalide → UnauthorizedException
     */
    it('devrait lever une exception si le code est invalide', async () => {
      mockTwoFactorService.enable.mockRejectedValue(
        new UnauthorizedException(),
      );
      await expect(service.enable2FA('uuid-123', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 disable2FA() — Désactiver la double authentification
  // ══════════════════════════════════════════════════════════

  describe('disable2FA()', () => {
    /**
     * ✅ Test : Code valide → 2FA désactivé
     *
     * L'utilisateur doit fournir un code valide pour
     * désactiver le 2FA (on ne peut pas le désactiver sans vérification).
     */
    it('devrait désactiver le 2FA quand le code est valide', async () => {
      mockTwoFactorService.disable.mockResolvedValue({
        key: 'auth.2fa_disabled',
        message: 'auth.2fa_disabled',
      });

      const result = await service.disable2FA('uuid-123', '847392');
      expect(result).toHaveProperty('key', 'auth.2fa_disabled');
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 verify2FA() — Vérifier le code de double authentification
  // ══════════════════════════════════════════════════════════

  describe('verify2FA()', () => {
    /**
     * 🔑 Mot de passe pré-hashé pour les tests verify2FA()
     */
    const hashedPassword = bcrypt.hashSync('SecurePass123!', 10);

    /**
     * ✅ Test 1 : Code 2FA valide → tokens retournés
     *
     * Flux complet du 2FA :
     * 1. L'utilisateur se connecte avec email + mot de passe
     * 2. Comme le 2FA est activé, il est redirigé vers la saisie du code
     * 3. Il saisit le code depuis Google Authenticator
     * 4. Si le code est valide → les tokens JWT sont générés et retournés
     */
    it('devrait retourner les tokens quand le code 2FA est valide', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        password: hashedPassword,
        status: 'ACTIVE',
        emailVerified: true,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP', // secret partagé avec l'app d'auth
      });
      prisma.refreshToken.create.mockResolvedValue({});
      mockTwoFactorService.verify.mockResolvedValue(true); // code correct
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.verify2FA({
        email: 'phanuel@example.com',
        code: '847392',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    /**
     * ✅ Test 2 : Code 2FA invalide → UnauthorizedException
     *
     * Le code saisi ne correspond pas au code généré
     * par l'application d'authentification.
     */
    it('devrait lever une exception si le code 2FA est invalide', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-123',
        email: 'phanuel@example.com',
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      });
      mockTwoFactorService.verify.mockResolvedValue(false); // code incorrect

      await expect(
        service.verify2FA({ email: 'phanuel@example.com', code: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
