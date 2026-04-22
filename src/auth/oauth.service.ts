/**
 * ============================================================
 * SERVICE — OAuthService (Authentification via Google OAuth)
 * ============================================================
 *
 * Ce fichier contient la logique métier de l'authentification
 * via des fournisseurs OAuth externes, actuellement Google.
 *
 * 💡 Rappel : c'est quoi OAuth ?
 *    OAuth est un protocole qui permet à un utilisateur de se
 *    connecter à votre application avec un compte tiers (Google,
 *    Apple...) sans créer de mot de passe supplémentaire.
 *    Google authentifie l'utilisateur et transmet son profil
 *    à votre application.
 *
 * 🔧 Dépendances injectées :
 *    - PrismaService  → accès à la base de données
 *    - I18nService    → messages de réponse traduits
 *    - JwtService     → génération des tokens JWT
 *    - EventEmitter2  → déclenchement d'événements (emails)
 *
 * 📋 Méthode exposée :
 *    - handleGoogleLogin() → gère les 3 cas de connexion Google
 *
 * 🔒 Méthodes privées (helpers internes) :
 *    - generateTokens()    → génère accessToken + refreshToken
 *    - saveRefreshToken()  → sauvegarde le refreshToken en base
 *
 * 🔀 Les 3 cas gérés par handleGoogleLogin() :
 *    ─────────────────────────────────────────────────────
 *    Cas 1 — Compte OAuth connu :
 *       Le compte Google est déjà lié → connexion directe
 *
 *    Cas 2 — Email existant (compte local) :
 *       Un compte avec cet email existe déjà → on lie Google
 *
 *    Cas 3 — Nouvel utilisateur :
 *       Aucun compte → on crée le compte + on lie Google
 *    ─────────────────────────────────────────────────────
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { AuthTokens, GoogleUser, JwtPayload } from './types/auth.types';
import { OAuthProvider, UserStatus } from '../generated/prisma/client';

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ══════════════════════════════════════════════════════════
  // 📌 handleGoogleLogin() — Connexion / Inscription via Google
  // ══════════════════════════════════════════════════════════

  /**
   * handleGoogleLogin()
   *
   * Point d'entrée unique pour toute connexion Google.
   * Gère les 3 cas possibles et retourne toujours des tokens JWT.
   *
   * 🔄 Flux de décision :
   *    ─────────────────────────────────────────────────────
   *    Étape 1 → Chercher un compte OAuth (provider + providerId)
   *              ↓ trouvé → Cas 1 : connexion directe
   *              ↓ non trouvé ↓
   *    Étape 2 → Chercher un compte local par email
   *              ↓ trouvé → Cas 2 : liaison du compte Google
   *              ↓ non trouvé → Cas 3 : création du compte
   *    Étape 3 → Générer les tokens JWT dans tous les cas
   *    ─────────────────────────────────────────────────────
   *
   * 💡 Pourquoi chercher d'abord par OAuth puis par email ?
   *    Un utilisateur peut avoir plusieurs méthodes de connexion.
   *    On cherche d'abord le lien OAuth (le plus précis) puis
   *    l'email pour éviter de créer des doublons de comptes.
   *
   * @param googleUser → profil Google structuré par GoogleStrategy
   *                     { providerId, email, firstName, lastName, photo }
   * @returns          → MessageResponse + AuthTokens
   */
  async handleGoogleLogin(
    googleUser: GoogleUser,
  ): Promise<{ key: string; message: string } & AuthTokens> {
    // ── Étape 1 : Chercher un compte OAuth existant ──────────
    /**
     * On recherche un lien OAuth par clé composite :
     * provider (GOOGLE) + providerId (id unique Google).
     *
     * provider_providerId → nom de l'index unique Prisma généré
     * depuis @@unique([provider, providerId]) dans le schéma.
     *
     * include: { user: true } → on récupère aussi l'utilisateur
     * lié pour ne pas faire une requête supplémentaire.
     */
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: OAuthProvider.GOOGLE,
          providerId: googleUser.providerId,
        },
      },
      include: { user: true },
    });

    // ── Cas 1 : Compte OAuth connu → connexion directe ───────
    /**
     * L'utilisateur s'est déjà connecté via Google dans le passé.
     * Le lien OAuth existe → on génère directement les tokens.
     * Aucun nouveau compte ni nouveau lien à créer.
     */
    if (existingOAuth) {
      const tokens = await this.generateTokens(
        existingOAuth.user.id,
        existingOAuth.user.email,
      );
      await this.saveRefreshToken(existingOAuth.user.id, tokens.refreshToken);

      const response = this.i18n.createResponse('auth.login_success');
      return { key: response.key, message: response.message, ...tokens };
    }

    // ── Étape 2 : Chercher un compte local par email ─────────
    /**
     * Aucun lien OAuth trouvé → on cherche si un compte existe
     * avec le même email (inscription classique email + mot de passe).
     */
    const existingUser = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    /**
     * userId sera défini dans les deux cas restants (Cas 2 et Cas 3)
     * et utilisé à la fin pour générer les tokens.
     */
    let userId: string;

    if (existingUser) {
      // ── Cas 2 : Email existant → liaison du compte Google ────
      /**
       * L'utilisateur a un compte local mais se connecte avec
       * Google pour la première fois. On crée le lien OAuth
       * sans créer de nouveau compte utilisateur.
       *
       * 💡 Après cette liaison, les prochaines connexions Google
       *    tomberont dans le Cas 1 (existingOAuth trouvé).
       */
      userId = existingUser.id;

      await this.prisma.oAuthAccount.create({
        data: {
          provider: OAuthProvider.GOOGLE,
          providerId: googleUser.providerId,
          userId,
        },
      });
    } else {
      // ── Cas 3 : Nouvel utilisateur → création du compte ──────
      /**
       * Ni compte OAuth ni compte local trouvé.
       * On crée un nouveau compte utilisateur avec le profil Google.
       *
       * 💡 Points importants :
       *    - emailVerified: true → Google garantit que l'email est valide,
       *      pas besoin d'envoyer un OTP de vérification
       *    - status: ACTIVE → le compte est actif immédiatement
       *    - password: null (implicite) → pas de mot de passe, connexion OAuth uniquement
       *    - oauthAccounts.create → on crée le lien OAuth en même temps
       *      (relation imbriquée Prisma pour éviter deux requêtes séparées)
       */
      const newUser = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          emailVerified: true, // Google garantit l'email
          status: UserStatus.ACTIVE, // actif immédiatement
          oauthAccounts: {
            create: {
              provider: OAuthProvider.GOOGLE,
              providerId: googleUser.providerId,
            },
          },
        },
      });

      userId = newUser.id;

      /**
       * Émettre l'événement 'user.oauth.created'
       *
       * Différent de 'user.created' (inscription classique) car
       * l'utilisateur OAuth n'a pas besoin de vérifier son email.
       * On peut envoyer un email de bienvenue différent.
       *
       * 💡 Pas de await → l'envoi d'email se fait en arrière-plan
       *    pour ne pas ralentir la réponse HTTP.
       */
      this.eventEmitter.emit('user.oauth.created', {
        email: googleUser.email,
        firstName: googleUser.firstName,
      });
    }

    // ── Étape 3 : Générer les tokens (Cas 2 et Cas 3) ────────
    /**
     * Dans les deux cas restants (liaison ou création),
     * on génère les tokens et on les retourne.
     */
    const tokens = await this.generateTokens(userId, googleUser.email);
    await this.saveRefreshToken(userId, tokens.refreshToken);

    const response = this.i18n.createResponse('auth.login_success');
    return { key: response.key, message: response.message, ...tokens };
  }

  // ══════════════════════════════════════════════════════════
  // 🔒 HELPERS PRIVÉS JWT
  // ══════════════════════════════════════════════════════════

  /**
   * generateTokens()
   *
   * Génère une paire de tokens JWT (access + refresh).
   * Même implémentation que dans AuthService — dupliquée
   * ici car OAuthService est indépendant d'AuthService.
   *
   * 💡 access token  → courte durée (défaut: 15 min)
   *    refresh token → longue durée (défaut: 7 jours)
   *    Deux secrets différents pour isoler les compromissions.
   *
   * @param userId → id de l'utilisateur (stocké comme `sub`)
   * @param email  → email de l'utilisateur
   * @returns      → AuthTokens { accessToken, refreshToken }
   */
  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as never,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as never,
    });

    return { accessToken, refreshToken };
  }

  /**
   * saveRefreshToken()
   *
   * Sauvegarde le refreshToken en base de données avec
   * sa date d'expiration (maintenant + 7 jours).
   *
   * 💡 Stocker le refreshToken en base permet de le révoquer
   *    manuellement (déconnexion, compromission détectée)
   *    sans attendre son expiration naturelle.
   *
   * @param userId → id de l'utilisateur propriétaire du token
   * @param token  → refreshToken JWT à sauvegarder
   */
  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expire dans 7 jours

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }
}
