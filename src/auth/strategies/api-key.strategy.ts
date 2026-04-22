/**
 * ============================================================
 * STRATÉGIE PASSPORT — ApiKeyStrategy (Authentification par clé API)
 * ============================================================
 *
 * Ce fichier définit la stratégie Passport qui vérifie
 * les clés API envoyées dans le header x-api-key.
 *
 * 💡 C'est quoi une stratégie Passport ?
 *    Passport est une bibliothèque d'authentification pour Node.js.
 *    Une "stratégie" définit COMMENT vérifier l'identité d'un
 *    utilisateur. Chaque méthode d'authentification a sa propre
 *    stratégie (JWT, Google OAuth, clé API...).
 *
 *    Le fonctionnement est toujours le même :
 *    1. Le Guard intercepte la requête
 *    2. Il délègue à la Stratégie correspondante
 *    3. La Stratégie appelle validate()
 *    4. Si validate() retourne un user → req.user est alimenté
 *    5. Si validate() lève une exception → erreur 401
 *
 * 🔄 Flux complet d'authentification par clé API :
 *    ─────────────────────────────────────────────────────
 *    1. Client envoie : GET /auth/api-keys/test
 *                       Header: x-api-key: sk_abc123...
 *    2. ApiKeyGuard intercepte la requête
 *    3. ApiKeyGuard délègue à ApiKeyStrategy (ce fichier)
 *    4. validate() extrait la clé du header x-api-key
 *    5. ApiKeyService.validate() cherche la clé en base
 *       et vérifie qu'elle est active et non expirée
 *    6. Si valide → retourne JwtUser → injecté dans req.user
 *    7. Le contrôleur peut accéder à l'user via @CurrentUser()
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Pourquoi passport-custom ?
 *    Il n'existe pas de stratégie Passport officielle pour
 *    les clés API. passport-custom permet de créer une
 *    stratégie entièrement personnalisée en définissant
 *    sa propre logique de validation dans validate().
 *
 * 💡 Différence avec JwtStrategy :
 *    - JwtStrategy    → extrait et vérifie un token JWT
 *                       depuis le header Authorization
 *    - ApiKeyStrategy → extrait et vérifie une clé API
 *                       depuis le header x-api-key
 * ============================================================
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiKeyService } from '../api-key.service';
import type { JwtUser } from '../types/auth.types';

/**
 * ApiKeyStrategy
 *
 * Étend PassportStrategy avec la stratégie 'custom' de
 * passport-custom, nommée 'api-key'.
 * Ce nom 'api-key' est celui utilisé par ApiKeyGuard :
 * AuthGuard('api-key')
 *            ↑
 *       même nom ici
 *
 * @Injectable() permet à NestJS d'injecter ApiKeyService
 * automatiquement via le constructeur.
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  /**
   * validate()
   *
   * Méthode appelée automatiquement par Passport à chaque
   * requête interceptée par ApiKeyGuard.
   *
   * 🔄 Étapes de validation :
   *    1. Extraire la clé API du header x-api-key
   *    2. Vérifier que la clé est présente
   *    3. Déléguer la vérification à ApiKeyService.validate()
   *       qui vérifie en base que la clé :
   *       - existe
   *       - est active (isActive: true)
   *       - n'est pas expirée (expiresAt dans le futur)
   *       - correspond au hash stocké (bcrypt.compare)
   *    4. Retourner l'utilisateur associé à la clé
   *
   * @param req  - La requête HTTP Express entrante
   * @returns    - L'utilisateur authentifié { id, email }
   * @throws UnauthorizedException si la clé est absente,
   *         invalide ou expirée → erreur 401
   */
  async validate(req: Request): Promise<JwtUser> {
    // Étape 1 — Extraire la clé API du header x-api-key
    // Le cast 'as string | undefined' est nécessaire car
    // req.headers retourne string | string[] | undefined
    const apiKey = req.headers['x-api-key'] as string | undefined;

    // Étape 2 — Vérifier que la clé est bien présente dans la requête
    if (!apiKey) {
      throw new UnauthorizedException('Clé API requise');
    }

    // Étape 3 — Déléguer la validation au service
    // ApiKeyService.validate() retourne JwtUser si valide, null sinon
    const user = await this.apiKeyService.validate(apiKey);

    // Étape 4 — Vérifier que la clé correspond à un utilisateur actif
    if (!user) {
      throw new UnauthorizedException('Clé API invalide ou expirée');
    }

    // Étape 5 — Retourner l'utilisateur → Passport l'injecte dans req.user
    // Le contrôleur peut ensuite y accéder via @CurrentUser()
    return user;
  }
}
