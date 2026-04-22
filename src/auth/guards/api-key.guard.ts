/**
 * ============================================================
 * GUARD — ApiKeyGuard (Protection par clé API)
 * ============================================================
 *
 * Ce fichier définit un guard qui protège les endpoints
 * nécessitant une authentification par clé API.
 *
 * 💡 C'est quoi un Guard dans NestJS ?
 *    Un guard est un composant qui s'exécute AVANT le contrôleur.
 *    Il décide si une requête peut continuer (true) ou doit
 *    être bloquée (false / exception).
 *    C'est la "porte d'entrée" d'un endpoint protégé.
 *
 * 💡 C'est quoi une clé API ?
 *    Une clé API est une chaîne unique (ex: sk_abc123...)
 *    qu'un client envoie dans le header de sa requête pour
 *    prouver son identité, sans avoir à se connecter avec
 *    un email et un mot de passe.
 *
 * 🔄 Flux d'authentification par clé API :
 *    ─────────────────────────────────────────────────────
 *    1. Le client envoie une requête avec le header :
 *       x-api-key: sk_abc123...
 *    2. ApiKeyGuard intercepte la requête
 *    3. Il délègue la vérification à ApiKeyStrategy
 *       (stratégie Passport nommée 'api-key')
 *    4. ApiKeyStrategy extrait et valide la clé
 *    5. Si valide → req.user est alimenté et la requête continue
 *    6. Si invalide → erreur 401 (Unauthorized) retournée
 *    ─────────────────────────────────────────────────────
 *
 * 🔧 Utilisation dans un contrôleur :
 *    ─────────────────────────────────────────────────────
 *    @Get('test')
 *    @UseGuards(ApiKeyGuard)
 *    testApiKey(@CurrentUser() user: JwtUser) {
 *      return { message: 'Clé API valide ✅', user };
 *    }
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Différence avec JwtAuthGuard :
 *    - JwtAuthGuard  → vérifie un token JWT dans le header
 *                      Authorization: Bearer <token>
 *                      Utilisé pour les utilisateurs connectés
 *                      via l'interface (navigateur, mobile)
 *    - ApiKeyGuard   → vérifie une clé API dans le header
 *                      x-api-key: <clé>
 *                      Utilisé pour les intégrations machine
 *                      à machine (scripts, services tiers)
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * ApiKeyGuard
 *
 * Étend AuthGuard('api-key') de Passport pour protéger
 * les endpoints nécessitant une authentification par clé API.
 *
 * Le paramètre 'api-key' correspond au nom donné à la stratégie
 * dans ApiKeyStrategy :
 * PassportStrategy(Strategy, 'api-key')
 *                              ↑
 *                         même nom ici
 *
 * @Injectable() permet à NestJS d'injecter ce guard
 * automatiquement dans le système d'injection de dépendances.
 */
@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {}
