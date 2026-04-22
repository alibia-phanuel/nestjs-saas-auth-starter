/**
 * ============================================================
 * GUARD — JwtAuthGuard (Protection par token JWT)
 * ============================================================
 *
 * Ce fichier définit le guard principal de l'application,
 * utilisé pour protéger tous les endpoints qui nécessitent
 * qu'un utilisateur soit connecté.
 *
 * 💡 C'est quoi un JWT (JSON Web Token) ?
 *    Un JWT est un token signé qui contient des informations
 *    sur l'utilisateur connecté (id, email...). Il est généré
 *    lors de la connexion et envoyé dans le header de chaque
 *    requête pour prouver l'identité de l'utilisateur.
 *
 *    Format du header HTTP :
 *    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * 🔄 Flux d'authentification JWT :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur se connecte via POST /auth/login
 *       → reçoit un accessToken (courte durée, ex: 15 min)
 *         et un refreshToken (longue durée, ex: 7 jours)
 *    2. Pour chaque requête protégée, le client envoie :
 *       Authorization: Bearer <accessToken>
 *    3. JwtAuthGuard intercepte la requête
 *    4. Il délègue la vérification à JwtStrategy
 *       (stratégie Passport nommée 'jwt')
 *    5. JwtStrategy vérifie la signature et l'expiration
 *    6. Si valide → req.user est alimenté avec { id, email }
 *       et la requête continue vers le contrôleur
 *    7. Si invalide ou expiré → erreur 401 (Unauthorized)
 *    ─────────────────────────────────────────────────────
 *
 * 🔧 Utilisation dans un contrôleur :
 *    ─────────────────────────────────────────────────────
 *    // ✅ Avec JwtAuthGuard (recommandé — plus lisible)
 *    @Get('profile')
 *    @UseGuards(JwtAuthGuard)
 *    getProfile(@CurrentUser() user: JwtUser) {
 *      return user;
 *    }
 *
 *    // ❌ Sans JwtAuthGuard (verbeux — à éviter)
 *    @Get('profile')
 *    @UseGuards(AuthGuard('jwt'))
 *    getProfile(@CurrentUser() user: JwtUser) {
 *      return user;
 *    }
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Différence avec les autres guards du projet :
 *    - JwtAuthGuard    → vérifie un token JWT (Bearer)
 *                        pour les utilisateurs connectés
 *                        via l'interface (navigateur, mobile)
 *    - ApiKeyGuard     → vérifie une clé API (x-api-key)
 *                        pour les intégrations machine à machine
 *    - GoogleAuthGuard → déclenche le flux OAuth Google
 *                        pour la connexion via compte Google
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard
 *
 * Étend AuthGuard('jwt') de Passport pour protéger
 * les endpoints nécessitant une authentification JWT.
 *
 * Le paramètre 'jwt' correspond au nom donné à la stratégie
 * dans JwtStrategy :
 * PassportStrategy(Strategy, 'jwt')
 *                              ↑
 *                         même nom ici
 *
 * Avantage de cette classe :
 * Au lieu d'écrire @UseGuards(AuthGuard('jwt')) partout
 * dans l'application (chaîne magique répétée), on écrit
 * simplement @UseGuards(JwtAuthGuard) — plus lisible,
 * plus maintenable et moins sujet aux erreurs de frappe.
 *
 * @Injectable() permet à NestJS d'injecter ce guard
 * automatiquement dans le système d'injection de dépendances.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
