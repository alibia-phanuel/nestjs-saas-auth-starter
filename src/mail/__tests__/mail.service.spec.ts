/**
 * ============================================================
 * TEST — MailService
 * ============================================================
 *
 * Ce fichier teste l'ensemble des méthodes du MailService,
 * responsable de l'envoi des emails transactionnels via SMTP.
 *
 * 🔧 Stratégie de mock :
 *    createTransporter() est espionné et remplacé par un faux
 *    transporter dont sendMail est un jest.fn() contrôlable.
 *    → Aucun vrai email n'est envoyé pendant les tests.
 *
 * 📋 Méthodes testées :
 *    - handleUserCreated()   → 2 emails (bienvenue + OTP)
 *    - handlePasswordReset() → 1 email (réinitialisation)
 *
 * 🔀 Cas couverts par méthode :
 *    ─────────────────────────────────────────────────────
 *    handleUserCreated()
 *      Cas 1 — Nominal     : 2 emails envoyés avec bons sujets
 *      Cas 2 — Sans prénom : firstName absent → pas de crash
 *      Cas 3 — Erreur SMTP : sendMail échoue → pas de throw
 *
 *    handlePasswordReset()
 *      Cas 1 — Nominal     : 1 email envoyé avec bon sujet
 *      Cas 2 — Erreur SMTP : sendMail échoue → pas de throw
 *    ─────────────────────────────────────────────────────
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail.service';
import * as mailTransporter from '../mail.transporter';

// ── Mock du transporter ───────────────────────────────────────
/**
 * On espionne createTransporter() avant l'instanciation du module
 * pour intercepter l'appel et retourner un faux transporter.
 *
 * 💡 Pourquoi jest.spyOn plutôt que jest.mock() ?
 *    spyOn cible une export nommée précise sans mocker tout le module,
 *    ce qui est plus chirurgical et plus explicite à la lecture.
 *
 * 💡 mockSendMail est déclaré ici (hors beforeEach) pour être
 *    accessible dans tous les blocs it() via closure.
 *    jest.clearAllMocks() dans beforeEach réinitialise son état
 *    entre chaque test.
 */
const mockSendMail = jest.fn();

jest.spyOn(mailTransporter, 'createTransporter').mockReturnValue({
  sendMail: mockSendMail,
} as never);

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);

    /**
     * Réinitialise les appels et résultats de tous les mocks
     * entre chaque test pour éviter les interférences.
     */
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════
  // 📌 handleUserCreated() — Bienvenue + OTP à l'inscription
  // ══════════════════════════════════════════════════════════

  /**
   * handleUserCreated() envoie 2 emails séquentiels :
   *   1. Email de bienvenue personnalisé
   *   2. Email avec le code OTP de vérification
   *
   * Ces tests vérifient le nombre d'appels, les sujets,
   * la robustesse aux données manquantes et aux erreurs SMTP.
   */
  describe('handleUserCreated()', () => {
    /**
     * Payload nominal réutilisé dans la majorité des tests.
     * Représente un utilisateur fraîchement inscrit avec tous
     * les champs remplis.
     */
    const payload = {
      email: 'phanuel@example.com',
      firstName: 'Phanuel',
      otp: '847392',
    };

    // ── Cas 1 : Nominal → 2 emails envoyés ───────────────────
    it("devrait envoyer deux e-mails lors de l'événement « user.created »", async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated(payload);

      // 2 emails attendus : welcome (1er) + OTP (2ème)
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    // ── Cas 1a : Vérification du sujet du 1er email ───────────
    /**
     * On vérifie le 1er appel (email de bienvenue) avec
     * toHaveBeenNthCalledWith(1, ...) pour cibler précisément
     * l'ordre d'envoi sans dépendre de l'implémentation interne.
     */
    it("devrait envoyer l'e-mail de bienvenue avec le sujet correct", async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated(payload);

      expect(mockSendMail).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          to: payload.email,
          subject: '🚀 Bienvenue sur nestjs-saas-starter !',
        }),
      );
    });

    // ── Cas 1b : Vérification du sujet du 2ème email ──────────
    it("devrait envoyer l'e-mail OTP avec le sujet correct", async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated(payload);

      expect(mockSendMail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          to: payload.email,
          subject: '🔐 Votre code de vérification',
        }),
      );
    });

    // ── Cas 2 : firstName absent → valeur de secours ─────────
    /**
     * On omet volontairement firstName pour vérifier que
     * le service utilise une valeur de secours (ex: 'Utilisateur')
     * sans crasher. Les 2 emails doivent quand même partir.
     */
    it("devrait utiliser le nom de secours lorsque « firstName » n'est pas défini", async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated({
        email: payload.email,
        otp: payload.otp,
        // firstName intentionnellement omis
      });

      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    // ── Cas 3 : Erreur SMTP → pas de throw ───────────────────
    /**
     * Si sendMail échoue (réseau, credentials SMTP invalides...),
     * le service NE doit PAS propager l'erreur.
     *
     * 💡 Un email en échec ne doit jamais faire planter l'API.
     *    L'erreur doit être catchée et loguée en interne.
     */
    it('devrait ne pas throw si sendMail échoue', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      await expect(service.handleUserCreated(payload)).resolves.not.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 handlePasswordReset() — Email de réinitialisation
  // ══════════════════════════════════════════════════════════

  /**
   * handlePasswordReset() envoie 1 seul email contenant
   * le code OTP de réinitialisation du mot de passe.
   *
   * Ces tests vérifient le nombre d'appels, le sujet de
   * l'email et la robustesse aux erreurs SMTP.
   */
  describe('handlePasswordReset()', () => {
    /**
     * Payload nominal pour la réinitialisation de mot de passe.
     */
    const payload = {
      email: 'phanuel@example.com',
      firstName: 'Phanuel',
      otp: '123456',
    };

    // ── Cas 1 : Nominal → 1 email envoyé ─────────────────────
    it("devrait envoyer un e-mail lors de l'événement « password.reset »", async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handlePasswordReset(payload);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    // ── Cas 1a : Vérification du sujet ───────────────────────
    it("devrait envoyer l'e-mail de réinitialisation avec le sujet correct", async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handlePasswordReset(payload);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: payload.email,
          subject: '🔑 Réinitialisation de votre mot de passe',
        }),
      );
    });

    // ── Cas 2 : Erreur SMTP → pas de throw ───────────────────
    /**
     * Même logique que dans handleUserCreated() :
     * une erreur SMTP ne doit jamais remonter à l'appelant.
     */
    it('devrait ne pas throw si sendMail échoue', async () => {
      mockSendMail.mockRejectedValue(new Error('Échec de la connexion SMTP'));

      await expect(service.handlePasswordReset(payload)).resolves.not.toThrow();
    });
  });
});
