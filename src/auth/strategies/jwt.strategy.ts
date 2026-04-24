/**
 * ============================================================
 * STRATÉGIE PASSPORT — JwtStrategy (Authentification par token JWT)
 * ============================================================
 *
 * Ce fichier définit la stratégie Passport qui vérifie les
 * tokens JWT envoyés dans le header Authorization des requêtes.
 *
 * 💡 C'est quoi un JWT (JSON Web Token) ?
 *    Un JWT est un token signé qui contient des informations
 *    encodées (appelées "payload"). Il est généré par le serveur
 *    lors de la connexion et envoyé au client. Le client le
 *    renvoie ensuite à chaque requête pour prouver son identité.
 *
 *    Structure d'un JWT (3 parties séparées par des points) :
 *    ─────────────────────────────────────────────────────
 *    eyJhbGciOiJIUzI1NiJ9    ← Header  (algorithme de signature)
 *    .eyJzdWIiOiJ1dWlkLTEyMyJ9 ← Payload (données : sub, email...)
 *    .SflKxwRJSMeKKF2QT4fwpM  ← Signature (garantit l'authenticité)
 *    ─────────────────────────────────────────────────────
 *
 * 🔄 Flux d'authentification JWT :
 *    ─────────────────────────────────────────────────────
 *    1. Client envoie une requête avec le header :
 *       Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
 *    2. JwtAuthGuard intercepte la requête
 *    3. passport-jwt extrait et vérifie automatiquement :
 *       - La présence du token dans le header Bearer
 *       - La validité de la signature (JWT_ACCESS_SECRET)
 *       - La non-expiration du token (ignoreExpiration: false)
 *    4. validate() est appelée avec le payload décodé
 *    5. On vérifie que l'utilisateur existe toujours en base
 *    6. L'utilisateur + ses rôles sont injectés dans req.user
 *    7. Le contrôleur y accède via @CurrentUser()
 *    ─────────────────────────────────────────────────────
 *
 * 🔐 RBAC — Rôles et Permissions :
 *    ─────────────────────────────────────────────────────
 *    validate() retourne maintenant les rôles de l'utilisateur.
 *    Ces rôles sont utilisés par RolesGuard pour vérifier si
 *    l'utilisateur a accès à une route protégée par @Roles().
 *
 *    Exemple de flow RBAC :
 *    GET /users → @Roles('admin') → RolesGuard vérifie
 *    req.user.roles contient 'admin' → accès autorisé ou 403
 *    ─────────────────────────────────────────────────────
 *
 * 🔧 Configuration requise dans le fichier .env :
 *    JWT_ACCESS_SECRET=votre_secret_très_long_et_aléatoire
 *
 * 💡 Pourquoi vérifier l'utilisateur en base dans validate() ?
 *    Le token JWT est valide cryptographiquement même si le
 *    compte a été supprimé ou suspendu entre sa création et
 *    son utilisation. En vérifiant en base, on s'assure que
 *    l'utilisateur existe toujours et peut se connecter.
 *
 * 💡 Différence avec les autres stratégies :
 *    - JwtStrategy    → vérifie un token JWT (Bearer)
 *                       pour les utilisateurs connectés
 *    - ApiKeyStrategy → vérifie une clé API (x-api-key)
 *                       pour les intégrations machine à machine
 *    - GoogleStrategy → gère le flux OAuth Google
 *                       pour la connexion sociale
 * ============================================================
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/auth.types';

// ── Type strict pour l'utilisateur retourné ───────────────
// Ce type représente ce qui est injecté dans req.user
// et accessible via @CurrentUser() dans les contrôleurs

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  roles: Array<{
    role: {
      name: string;
      permissions: Array<{ action: string }>;
    };
  }>;
}

/**
 * JwtStrategy
 *
 * Étend PassportStrategy avec la stratégie JWT de
 * passport-jwt, nommée 'jwt'.
 * Ce nom 'jwt' est celui utilisé par JwtAuthGuard :
 * AuthGuard('jwt')
 *            ↑
 *       même nom ici
 *
 * @Injectable() permet à NestJS d'injecter PrismaService
 * automatiquement via le constructeur.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * constructor()
   *
   * Configure la stratégie JWT avec trois paramètres essentiels.
   * PrismaService est injecté pour vérifier l'utilisateur en base
   * dans validate().
   */
  constructor(private readonly prisma: PrismaService) {
    super({
      /**
       * jwtFromRequest — Comment extraire le token de la requête
       *
       * ExtractJwt.fromAuthHeaderAsBearerToken() indique à Passport
       * d'extraire le token depuis le header Authorization :
       * Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
       *                        ↑
       *                   token extrait ici
       */
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      /**
       * ignoreExpiration — Respecter la date d'expiration du token
       *
       * false → si le token est expiré, Passport rejette
       *         automatiquement la requête avec une erreur 401
       *         sans même appeler validate()
       * true  → le token expiré serait accepté (dangereux !)
       */
      ignoreExpiration: false,

      /**
       * secretOrKey — Clé secrète pour vérifier la signature
       *
       * Cette clé DOIT être identique à celle utilisée pour
       * signer le token lors de la connexion (dans AuthService).
       * Si les clés diffèrent, la signature est invalide → 401.
       *
       * ?? 'fallback_secret' → valeur de secours si la variable
       * .env est absente. Ne jamais utiliser en production !
       */
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'fallback_secret',
    });
  }

  /**
   * validate()
   *
   * Méthode appelée automatiquement par Passport APRÈS avoir
   * vérifié avec succès la signature et l'expiration du token.
   * Le payload décodé du JWT est injecté automatiquement.
   *
   * 💡 À ce stade, Passport a déjà garanti que :
   *    - Le token est bien formé
   *    - La signature est valide (bonne clé secrète)
   *    - Le token n'est pas expiré
   *    Notre seul travail ici est de vérifier que l'utilisateur
   *    existe toujours en base de données.
   *
   * 🔄 Étapes de validation :
   *    1. Recevoir le payload décodé { sub, email }
   *    2. Chercher l'utilisateur + ses rôles en base
   *    3. Si introuvable → lancer une UnauthorizedException (401)
   *    4. Retourner l'utilisateur avec rôles → injecté dans req.user
   *
   * 🔐 Rôles inclus dans req.user :
   *    Les rôles sont maintenant inclus dans l'objet retourné.
   *    RolesGuard les utilise pour vérifier les permissions :
   *
   *    req.user.roles = [
   *      {
   *        role: {
   *          name: 'admin',
   *          permissions: [
   *            { action: 'users:read' },
   *            { action: 'users:delete' }
   *          ]
   *        }
   *      }
   *    ]
   *
   * @param payload - Le payload décodé du JWT contenant :
   *                  sub   → l'id de l'utilisateur (subject)
   *                  email → l'email de l'utilisateur
   * @returns       - L'utilisateur complet avec ses rôles
   * @throws UnauthorizedException si l'utilisateur n'existe plus
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    /**
     * Recherche de l'utilisateur en base via son id (payload.sub)
     *
     * select: { ... } → on ne récupère que les champs nécessaires
     * pour éviter de retourner des données sensibles (mot de passe,
     * secrets 2FA...) dans req.user accessible partout dans l'app.
     *
     * roles → inclus pour le RolesGuard (RBAC)
     * Chaque UserRole inclut le Role avec ses permissions
     */
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        // password: false       → NON sélectionné (sécurité)
        // twoFactorSecret: false → NON sélectionné (sécurité)
        // otpCode: false         → NON sélectionné (sécurité)

        // ── RBAC — Rôles et permissions ──────────────
        // Inclus pour que RolesGuard puisse vérifier
        // les rôles sans requête supplémentaire en base
        roles: {
          include: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: { action: true },
                },
              },
            },
          },
        },
      },
    });

    // Si l'utilisateur a été supprimé ou n'existe plus → 401
    if (!user) {
      throw new UnauthorizedException();
    }

    // Retourner l'utilisateur avec ses rôles
    // Passport l'injecte dans req.user
    // Accessible ensuite via @CurrentUser() dans les contrôleurs
    //
    // Exemple d'utilisation dans un contrôleur :
    // @Get('profile')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('admin')
    // getProfile(@CurrentUser() user: AuthenticatedUser) {
    //   return user; // contient id, email, roles...
    // }
    return user;
  }
}
