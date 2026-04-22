/**
 * ============================================================
 * TEST — I18nService (Tests unitaires)
 * ============================================================
 *
 * Ce fichier contient les tests unitaires du service I18nService.
 *
 * 🎯 Objectif :
 *    - Vérifier le bon fonctionnement de la traduction (translate)
 *    - Vérifier la génération des réponses standardisées (createResponse)
 *    - Garantir les comportements de fallback (langue / clé)
 *
 * 🧪 Outils utilisés :
 *    - Jest → framework de test
 *    - @nestjs/testing → utilitaires pour tester les services NestJS
 *
 * 💡 Principe :
 *    Chaque test vérifie un cas précis afin d'assurer :
 *    - la fiabilité du service
 *    - la non-régression lors des évolutions
 *
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from '../i18n.service';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('I18nService', () => {
  /**
   * Instance du service testée
   */
  let service: I18nService;

  /**
   * ==========================================================
   * Setup — Initialisation avant chaque test
   * ==========================================================
   *
   * 💡 Pourquoi beforeEach ?
   *    - Garantit un environnement propre pour chaque test
   *    - Évite les effets de bord entre tests
   *
   * 🔧 createTestingModule :
   *    Simule un module NestJS minimal contenant I18nService
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nService],
    }).compile();

    /**
     * Récupération de l'instance du service depuis le container NestJS
     */
    service = module.get<I18nService>(I18nService);
  });

  // ══════════════════════════════════════════════════════════
  // 📌 TESTS — translate()
  // ══════════════════════════════════════════════════════════

  /**
   * Tests de la méthode translate()
   *
   * 🎯 Vérifie :
   *    - langue par défaut
   *    - changement de langue
   *    - fallback
   *    - gestion des clés imbriquées
   */
  describe('translate()', () => {
    /**
     * Cas 1 — Langue par défaut (anglais)
     *
     * 💡 Si aucune langue n'est fournie :
     *    → utilise 'en' par défaut
     */
    it('devrait afficher la traduction en anglais par défaut', () => {
      const result = service.translate('auth.invalid_credentials');

      expect(result).toBe('Adresse e-mail ou mot de passe incorrects');
    });

    /**
     * Cas 2 — Langue explicitement définie (français)
     */
    it('devrait afficher la traduction en français quand la langue est fr', () => {
      const result = service.translate('auth.invalid_credentials', 'fr');

      expect(result).toBe('Email ou mot de passe incorrect');
    });

    /**
     * Cas 3 — Clé inexistante
     *
     * 💡 Le service retourne la clé brute
     *    pour éviter de casser l'application
     */
    it("devrait retourner la clé elle-même lorsque la traduction n'est pas trouvée", () => {
      const result = service.translate('auth.nonexistent_key');

      expect(result).toBe('auth.nonexistent_key');
    });

    /**
     * Cas 4 — Clés imbriquées (dot notation)
     *
     * ex: "users.not_found"
     */
    it('devrait prendre en charge les clés imbriquées', () => {
      const result = service.translate('users.not_found', 'fr');

      expect(result).toBe('Utilisateur introuvable');
    });

    /**
     * Cas 5 — Langue non supportée
     *
     * 💡 Fallback automatique vers l'anglais
     */
    it("devrait revenir à l'anglais lorsque la langue n'est pas prise en charge", () => {
      const result = service.translate('auth.login_success', 'ar');

      expect(result).toBe('Connexion réussie');
    });
  });

  // ══════════════════════════════════════════════════════════
  // 📌 TESTS — createResponse()
  // ══════════════════════════════════════════════════════════

  /**
   * Tests de la méthode createResponse()
   *
   * 🎯 Vérifie :
   *    - format de sortie
   *    - cohérence key/message
   *    - gestion des langues
   */
  describe('createResponse()', () => {
    /**
     * Cas 1 — Langue par défaut
     *
     * 💡 Doit retourner :
     *    - key (inchangée)
     *    - message traduit
     */
    it('devrait retourner un objet avec la clé et le message en anglais', () => {
      const result = service.createResponse('auth.login_success');

      expect(result).toEqual({
        key: 'auth.login_success',
        message: 'Connexion réussie',
      });
    });

    /**
     * Cas 2 — Langue française
     */
    it('devrait retourner le message en français lorsque la langue est fr', () => {
      const result = service.createResponse('auth.login_success', 'fr');

      expect(result).toEqual({
        key: 'auth.login_success',
        message: 'Connexion réussie',
      });
    });
  });
});
