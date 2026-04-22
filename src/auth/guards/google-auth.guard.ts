/**
 * ============================================================
 * GUARD — GoogleAuthGuard (Protection par authentification Google)
 * ============================================================
 *
 * Ce fichier définit un guard qui protège les endpoints
 * déclenchant le flux d'authentification OAuth via Google.
 *
 * 💡 C'est quoi OAuth avec Google ?
 *    OAuth est un protocole qui permet à un utilisateur de
 *    se connecter à votre application avec son compte Google,
 *    sans créer de mot de passe supplémentaire. Google
 *    authentifie l'utilisateur et transmet son profil
 *    (email, prénom, photo...) à votre application.
 *
 * 🔄 Flux d'authentification Google OAuth :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur clique sur "Se connecter avec Google"
 *    2. Le frontend appelle GET /auth/google
 *       → GoogleAuthGuard intercepte la requête
 *       → GoogleStrategy redirige vers la page de connexion Google
 *    3. L'utilisateur choisit son compte Google
 *    4. Google redirige vers GET /auth/google/callback
 *       avec un code d'autorisation
 *    5. GoogleStrategy échange le code contre le profil
 *       Google de l'utilisateur
 *    6. OAuthService.handleGoogleLogin() est appelé avec
 *       le profil Google pour créer ou connecter le compte
 *    7. Les tokens JWT sont retournés au client
 *    ─────────────────────────────────────────────────────
 *
 * 🔧 Utilisation dans un contrôleur :
 *    ─────────────────────────────────────────────────────
 *    // Étape 1 — Lancer la redirection vers Google
 *    @Get('google')
 *    @UseGuards(GoogleAuthGuard)
 *    googleLogin() {}  // NestJS redirige automatiquement
 *
 *    // Étape 2 — Récupérer le profil après redirection
 *    @Get('google/callback')
 *    @UseGuards(GoogleAuthGuard)
 *    googleCallback(@CurrentUser() user: JwtUser) {
 *      return user;
 *    }
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Différence avec les autres guards du projet :
 *    - JwtAuthGuard    → vérifie un token JWT (Bearer)
 *                        pour les utilisateurs connectés
 *    - ApiKeyGuard     → vérifie une clé API (x-api-key)
 *                        pour les intégrations machine à machine
 *    - GoogleAuthGuard → déclenche le flux OAuth Google
 *                        pour la connexion via compte Google
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GoogleAuthGuard
 *
 * Étend AuthGuard('google') de Passport pour protéger
 * les endpoints du flux d'authentification Google OAuth.
 *
 * Le paramètre 'google' correspond au nom donné à la stratégie
 * dans GoogleStrategy :
 * PassportStrategy(Strategy, 'google')
 *                              ↑
 *                         même nom ici
 *
 * @Injectable() permet à NestJS d'injecter ce guard
 * automatiquement dans le système d'injection de dépendances.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
