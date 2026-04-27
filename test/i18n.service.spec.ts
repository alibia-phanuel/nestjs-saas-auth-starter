/**
 * ============================================================
 * TEST — I18nService
 * ============================================================
 *
 * Ce fichier teste les méthodes du I18nService, responsable
 * de la traduction des clés i18n en messages lisibles.
 *
 * 💡 Pas de mock ici : I18nService est testé tel quel,
 *    les traductions sont lues depuis les fichiers de locale
 *    réels. On teste donc le comportement réel du service
 *    et la cohérence des fichiers de traduction.
 *
 * 📋 Méthodes testées :
 *    - translate()      → résolution d'une clé vers un message
 *    - createResponse() → objet { key, message } structuré
 *
 * 🔀 Cas couverts :
 *    ─────────────────────────────────────────────────────
 *    translate()
 *      Cas 1 — Langue par défaut     : clé → message (défaut)
 *      Cas 2 — Langue explicite (fr) : clé → message français
 *      Cas 3 — Clé inexistante       : retourne la clé brute
 *      Cas 4 — Clé imbriquée         : résolution profonde (a.b.c)
 *      Cas 5 — Langue non supportée  : repli sur la langue par défaut
 *
 *    createResponse()
 *      Cas 1 — Langue par défaut     : { key, message } en défaut
 *      Cas 2 — Langue explicite (fr) : { key, message } en français
 *    ─────────────────────────────────────────────────────
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from '../src/i18n/i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  /**
   * Instancie I18nService dans un module de test NestJS minimal.
   * Aucune dépendance externe à mocker : le service lit les
   * fichiers de locale directement depuis le système de fichiers.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nService],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  // ══════════════════════════════════════════════════════════
  // 📌 translate() — Résolution d'une clé vers un message
  // ══════════════════════════════════════════════════════════

  /**
   * translate() prend une clé i18n (ex: 'auth.login_success')
   * et une langue optionnelle, et retourne le message traduit.
   *
   * Ces tests couvrent les cas nominaux, les cas limites
   * (clé absente, langue non supportée) et les clés imbriquées.
   */
  describe('translate()', () => {
    // ── Cas 1 : Langue par défaut ─────────────────────────────
    /**
     * Sans langue explicite, le service doit utiliser la langue
     * par défaut configurée (ici le français, retournant le
     * message attendu sans paramètre de langue).
     */
    it('devrait afficher la traduction en anglais par défaut', () => {
      const result = service.translate('auth.invalid_credentials');
      expect(result).toBe('Invalid email or password');
    });

    // ── Cas 2 : Langue explicite (fr) ────────────────────────
    it('devrait afficher la traduction en français quand la langue est fr', () => {
      const result = service.translate('auth.invalid_credentials', 'fr');
      expect(result).toBe('Email ou mot de passe incorrect');
    });

    // ── Cas 3 : Clé inexistante → retour de la clé brute ─────
    /**
     * Si la clé n'existe dans aucun fichier de locale, le service
     * ne doit pas crasher mais retourner la clé elle-même.
     * Ce comportement permet de détecter les clés manquantes
     * directement dans l'interface sans erreur silencieuse.
     */
    it("devrait retourner la clé elle-même lorsque la traduction n'est pas trouvée", () => {
      const result = service.translate('auth.nonexistent_key');
      expect(result).toBe('auth.nonexistent_key');
    });

    // ── Cas 4 : Clé imbriquée (notation pointée) ──────────────
    /**
     * Les clés i18n utilisent la notation pointée (a.b.c) pour
     * représenter une structure JSON imbriquée.
     * On vérifie que le service résout correctement la profondeur.
     */
    it('devrait prendre en charge les clés imbriquées', () => {
      const result = service.translate('users.not_found', 'fr');
      expect(result).toBe('Utilisateur introuvable');
    });

    // ── Cas 5 : Langue non supportée → repli sur le défaut ────
    /**
     * Si la langue demandée n'est pas dans les locales disponibles
     * (ex: 'ar'), le service doit se replier sur la langue par
     * défaut plutôt que de retourner undefined ou de crasher.
     */
    it("devrait revenir à la langue par défaut lorsque la langue n'est pas prise en charge", () => {
      const result = service.translate('auth.login_success', 'ar');
      expect(result).toBe('Login successful');
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 createResponse() — Objet { key, message } structuré
  // ══════════════════════════════════════════════════════════

  /**
   * createResponse() encapsule translate() et retourne un objet
   * { key, message } utilisé directement dans les réponses HTTP.
   *
   * 💡 Retourner la clé en plus du message permet au client
   *    de gérer lui-même la traduction côté frontend si besoin,
   *    sans dépendre de la langue choisie par le backend.
   */
  describe('createResponse()', () => {
    // ── Cas 1 : Langue par défaut ─────────────────────────────
    it('devrait renvoyer un objet contenant la clé et le message par défaut', () => {
      const result = service.createResponse('auth.login_success');
      expect(result).toEqual({
        key: 'auth.login_success',
        message: 'Login successful',
      });
    });

    // ── Cas 2 : Langue explicite (fr) ────────────────────────
    it('devrait afficher le message en français lorsque la langue est « fr »', () => {
      const result = service.createResponse('auth.login_success', 'fr');
      expect(result).toEqual({
        key: 'auth.login_success',
        message: 'Connexion réussie',
      });
    });
  });
});
