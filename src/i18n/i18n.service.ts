/**
 * ============================================================
 * SERVICE — I18nService (Internationalisation / Traduction)
 * ============================================================
 *
 * Ce service gère la traduction des messages dans l'application
 * en utilisant des fichiers JSON par langue (ex: en.json, fr.json).
 *
 * 💡 Principe :
 *    - Les messages sont définis sous forme de clés (dot notation)
 *      ex: "auth.login_success"
 *    - Chaque clé correspond à une valeur dans les fichiers JSON
 *    - Le service retourne le message traduit selon la langue
 *
 * 📦 Sources de traduction :
 *    - en.json → anglais (langue par défaut)
 *    - fr.json → français
 *
 * 🌍 Fonctionnalités :
 *    - Traduction dynamique via clé (translate)
 *    - Fallback automatique vers l'anglais si clé introuvable
 *    - Génération de réponses API standardisées (createResponse)
 *
 * 🎯 Objectif :
 *    - Éviter les strings en dur dans le code
 *    - Centraliser tous les messages
 *    - Faciliter le multi-langue et la maintenance
 *
 * 💡 Exemple d'utilisation :
 *
 *    this.i18n.translate('auth.login_success', 'fr')
 *    → "Connexion réussie"
 *
 *    this.i18n.createResponse('auth.login_success', 'fr')
 *    → { key: 'auth.login_success', message: 'Connexion réussie' }
 *
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import * as en from './en.json';
import * as fr from './fr.json';

/**
 * Type générique représentant un dictionnaire de traduction.
 *
 * 💡 Structure attendue :
 * {
 *   auth: {
 *     login_success: "..."
 *   }
 * }
 */
type TranslationDict = Record<string, unknown>;

/**
 * Map de toutes les langues disponibles.
 *
 * 🔑 clé   → code langue ("en", "fr")
 * 📦 valeur → dictionnaire JSON correspondant
 *
 * 💡 Facilement extensible :
 *    Ajouter une langue = ajouter un import + une entrée ici
 */
const translations: Record<string, TranslationDict> = { en, fr };

@Injectable()
export class I18nService {
  /**
   * ==========================================================
   * translate()
   * ==========================================================
   *
   * Traduit une clé en utilisant la notation pointée (dot notation).
   *
   * 🔍 Exemple :
   *    "auth.login_success"
   *    → auth → login_success → "Connexion réussie"
   *
   * 🔄 Logique :
   *    1. Sélectionner le dictionnaire de langue
   *    2. Parcourir les clés imbriquées
   *    3. Retourner la valeur si trouvée
   *    4. Fallback vers l'anglais si nécessaire
   *
   * ⚠️ Gestion des erreurs :
   *    - Clé invalide → retourne la clé brute
   *    - Clé absente dans la langue → fallback anglais
   *    - Clé absente partout → retourne la clé brute
   *
   * @param key  → clé de traduction (ex: "auth.invalid_credentials")
   * @param lang → langue cible (défaut: "en")
   *
   * @returns message traduit ou clé brute si introuvable
   *
   * @example
   * translate('auth.login_success', 'fr')
   * → "Connexion réussie"
   */
  translate(key: string, lang = 'en'): string {
    /**
     * Étape 1 : Sélection du dictionnaire
     *
     * 💡 Si la langue demandée n'existe pas :
     *    fallback automatique vers l'anglais
     */
    const dict = translations[lang] ?? translations['en'];

    /**
     * Étape 2 : Découpage de la clé
     *
     * "auth.login_success" → ["auth", "login_success"]
     */
    const parts = key.split('.');

    /**
     * current représente la position actuelle
     * dans l'arbre de traduction
     */
    let current: unknown = dict;

    /**
     * Étape 3 : Navigation dans l'objet JSON
     *
     * On descend niveau par niveau :
     * dict → auth → login_success
     */
    for (const part of parts) {
      /**
       * Si la structure est invalide → on arrête
       */
      if (typeof current !== 'object' || current === null) {
        return key; // fallback → clé brute
      }

      /**
       * Accès dynamique à la propriété suivante
       */
      current = (current as Record<string, unknown>)[part];
    }

    /**
     * Étape 4 : Vérification finale
     */

    // Cas 1 → valeur trouvée (string valide)
    if (typeof current === 'string') return current;

    /**
     * Cas 2 → clé absente dans la langue actuelle
     *         mais différente de l'anglais
     *
     * 🔁 Fallback automatique vers 'en'
     */
    if (lang !== 'en') return this.translate(key, 'en');

    /**
     * Cas 3 → clé introuvable même en anglais
     *
     * ⚠️ On retourne la clé brute pour éviter
     *    de casser l'application
     */
    return key;
  }

  /**
   * ==========================================================
   * createResponse()
   * ==========================================================
   *
   * Génère une réponse API standardisée contenant :
   *    - la clé (utile côté frontend)
   *    - le message traduit (utile côté backend)
   *
   * 🎯 Pourquoi retourner les deux ?
   *    - Backend → message prêt à afficher
   *    - Frontend → possibilité de retraduire localement
   *
   * 📦 Format de sortie :
   * {
   *   key: "auth.login_success",
   *   message: "Connexion réussie"
   * }
   *
   * @param key  → clé de traduction
   * @param lang → langue cible
   *
   * @returns objet contenant key + message traduit
   *
   * @example
   * createResponse('auth.login_success', 'fr')
   * → { key: 'auth.login_success', message: 'Connexion réussie' }
   */
  createResponse(key: string, lang = 'en'): { key: string; message: string } {
    return {
      key,
      message: this.translate(key, lang),
    };
  }
}
