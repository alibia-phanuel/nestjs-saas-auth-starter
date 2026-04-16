import { Injectable } from '@nestjs/common';
import * as en from './en.json';
import * as fr from './fr.json';

// Type pour notre dictionnaire de traductions
type TranslationDict = Record<string, unknown>;

// Map de toutes les langues disponibles
const translations: Record<string, TranslationDict> = { en, fr };

@Injectable()
export class I18nService {
  /**
   * Traduit une clé pointée (dot notation)
   *
   * @param key  ex: 'auth.invalid_credentials'
   * @param lang ex: 'fr' (défaut: 'en')
   *
   * @example
   * translate('auth.login_success', 'fr') → 'Connexion réussie'
   */
  translate(key: string, lang = 'en'): string {
    // On prend le dictionnaire de la langue demandée
    // Si la langue n'existe pas → fallback sur 'en'
    const dict = translations[lang] ?? translations['en'];

    // On parcourt les parties de la clé : 'auth.login_success' → ['auth', 'login_success']
    const parts = key.split('.');
    let current: unknown = dict;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return key; // clé invalide → on retourne la clé brute
      }
      current = (current as Record<string, unknown>)[part];
    }

    // On a trouvé une string → on la retourne
    if (typeof current === 'string') return current;

    // Langue non 'en' mais clé non trouvée → fallback anglais
    if (lang !== 'en') return this.translate(key, 'en');

    // Clé introuvable même en anglais → on retourne la clé brute
    return key;
  }

  /**
   * Crée une réponse standardisée avec la clé ET le message traduit
   * Le frontend reçoit la key pour traduire lui-même si besoin
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
