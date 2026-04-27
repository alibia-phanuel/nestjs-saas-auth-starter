/**
 * ============================================================
 * CONFIG — ThrottlerConfig (Rate Limiting)
 * ============================================================
 *
 * Le rate limiting protège l'API contre les attaques :
 * - Brute force (essais multiples de mots de passe)
 * - DDoS (saturation du serveur)
 * - Spam (envoi massif d'emails OTP)
 *
 * 💡 Rappel Module 8 (05:02:02 Custom Configuration)
 *    On centralise la config ici plutôt que de hardcoder
 *    les valeurs dans AppModule. Changement en 1 endroit.
 *
 * 🔢 Stratégie par défaut :
 *    ttl   → durée de la fenêtre en millisecondes
 *    limit → nombre max de requêtes dans cette fenêtre
 *
 * Exemple : ttl=60000, limit=10
 *    → max 10 requêtes par minute par IP
 *    → la 11ème requête reçoit une erreur 429
 *
 * 🔢 Stratégies par endpoint :
 *    Les endpoints sensibles ont des limites plus strictes :
 *    - /auth/login        → 5 tentatives / minute
 *    - /auth/signup       → 3 tentatives / minute
 *    - /auth/forgot-password → 3 tentatives / minute
 *    - /auth/verify-otp   → 10 tentatives / minute
 *    - Endpoints généraux → 100 requêtes / minute
 * ============================================================
 */

import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * throttlerConfig
 *
 * Configuration du module @nestjs/throttler.
 * Définit plusieurs "throttles" nommés pour des
 * stratégies différentes selon les endpoints.
 *
 * Utilisation dans un controller :
 *    @Throttle({ auth: { limit: 5, ttl: 60000 } })
 *    @Post('login')
 *    login() { ... }
 */
export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      /**
       * Throttle par défaut — endpoints généraux
       * 100 requêtes par minute par IP
       */
      name: 'default',
      ttl: 60_000, // 1 minute en ms
      limit: 100,
    },
    {
      /**
       * Throttle strict — endpoints d'authentification
       * 5 requêtes par minute par IP
       * Protège contre le brute force
       */
      name: 'auth',
      ttl: 60_000, // 1 minute en ms
      limit: 5,
    },
    {
      /**
       * Throttle très strict — envoi d'emails
       * 3 requêtes par minute par IP
       * Évite le spam d'emails OTP
       */
      name: 'email',
      ttl: 60_000, // 1 minute en ms
      limit: 3,
    },
  ],
};
