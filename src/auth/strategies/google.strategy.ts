/**
 * ============================================================
 * STRATÉGIE PASSPORT — GoogleStrategy (Authentification via Google)
 * ============================================================
 *
 * Ce fichier définit la stratégie Passport qui gère le flux
 * d'authentification OAuth 2.0 avec Google.
 *
 * 💡 Rappel : c'est quoi OAuth 2.0 avec Google ?
 *    OAuth 2.0 est un protocole d'autorisation qui permet à
 *    votre application de demander à Google l'accès au profil
 *    d'un utilisateur. Google authentifie l'utilisateur et
 *    transmet ses informations (email, nom, photo...) à votre
 *    application — sans que vous n'ayez jamais accès à son
 *    mot de passe Google.
 *
 * 🔧 Configuration requise dans le fichier .env :
 *    ─────────────────────────────────────────────────────
 *    GOOGLE_CLIENT_ID=...       # ID de votre app Google
 *    GOOGLE_CLIENT_SECRET=...   # Secret de votre app Google
 *    GOOGLE_CALLBACK_URL=...    # URL de retour après connexion
 *                               # ex: http://localhost:3000/auth/google/callback
 *    ─────────────────────────────────────────────────────
 *    Ces valeurs sont obtenues en créant une application dans
 *    Google Cloud Console → APIs & Services → Identifiants.
 *
 * 🔄 Flux OAuth Google complet :
 *    ─────────────────────────────────────────────────────
 *    1. Client appelle GET /auth/google
 *       → GoogleAuthGuard déclenche la redirection
 *    2. L'utilisateur est redirigé vers accounts.google.com
 *       et choisit son compte Google
 *    3. Google redirige vers GOOGLE_CALLBACK_URL avec
 *       un code d'autorisation temporaire
 *    4. passport-google-oauth20 échange automatiquement
 *       ce code contre un accessToken Google
 *    5. validate() est appelée avec le profil Google
 *    6. On extrait les infos utiles et on appelle done()
 *    7. OAuthService.handleGoogleLogin() crée ou connecte
 *       le compte utilisateur
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Différence avec ApiKeyStrategy et JwtStrategy :
 *    - JwtStrategy    → vérifie un token JWT (connexion classique)
 *    - ApiKeyStrategy → vérifie une clé API (machine à machine)
 *    - GoogleStrategy → gère le flux OAuth Google (connexion sociale)
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import type { GoogleProfile, GoogleUser } from '../types/auth.types';

/**
 * GoogleStrategy
 *
 * Étend PassportStrategy avec la stratégie OAuth 2.0 de
 * passport-google-oauth20, nommée 'google'.
 * Ce nom 'google' est celui utilisé par GoogleAuthGuard :
 * AuthGuard('google')
 *            ↑
 *       même nom ici
 *
 * @Injectable() permet à NestJS d'injecter cette stratégie
 * automatiquement dans le système d'injection de dépendances.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  /**
   * constructor()
   *
   * Configure la stratégie Google avec les paramètres OAuth.
   * super() est appelé avec la configuration nécessaire pour
   * que passport-google-oauth20 puisse dialoguer avec Google.
   *
   * 💡 L'opérateur ?? '' (nullish coalescing) garantit que
   *    les valeurs ne sont jamais undefined — une chaîne vide
   *    est utilisée comme fallback si la variable .env est absente.
   *    En production, ces variables DOIVENT être définies.
   *
   * scope: ['email', 'profile'] → on demande à Google l'accès
   * à l'email et au profil public de l'utilisateur (nom, photo).
   * Google affichera ces permissions dans l'écran de consentement.
   */
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '', // ID de l'app Google Cloud
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '', // Secret de l'app Google Cloud
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '', // URL de retour après connexion Google
      scope: ['email', 'profile'], // Données demandées à Google
    });
  }

  /**
   * validate()
   *
   * Méthode appelée automatiquement par Passport APRÈS que
   * Google a authentifié l'utilisateur et transmis son profil.
   * Ce qu'on retourne via done() est injecté dans req.user.
   *
   * 🔄 Étapes de traitement :
   *    1. Recevoir le profil Google brut (GoogleProfile)
   *    2. Extraire les informations utiles du profil
   *    3. Construire un objet GoogleUser structuré
   *    4. Appeler done(null, user) pour signaler le succès
   *       → Passport injecte user dans req.user
   *       → OAuthService.handleGoogleLogin() prend le relais
   *
   * @param _accessToken  - Token d'accès Google (non utilisé ici
   *                        car on n'appelle pas l'API Google)
   * @param _refreshToken - Token de rafraîchissement Google
   *                        (non utilisé ici)
   * @param profile       - Profil Google brut de l'utilisateur
   *                        contenant id, name, emails, photos...
   * @param done          - Callback Passport à appeler en fin
   *                        de validation :
   *                        done(null, user)  → succès
   *                        done(error, false) → échec
   */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void {
    // Déstructuration du profil Google brut
    const { id, name, emails, photos } = profile;

    /**
     * Construction de l'objet GoogleUser structuré
     * à partir des données brutes du profil Google.
     *
     * emails[0].value  → premier email du compte Google
     * name.givenName   → prénom
     * name.familyName  → nom de famille
     * photos[0]?.value → photo de profil (optionnelle,
     *                    '' si aucune photo disponible)
     */
    const user: GoogleUser = {
      providerId: id, // identifiant unique Google (ex: "117364...")
      email: emails[0].value, // adresse email Google
      firstName: name.givenName, // prénom
      lastName: name.familyName, // nom de famille
      photo: photos[0]?.value ?? '', // URL de la photo de profil
    };

    // Signaler le succès à Passport → user est injecté dans req.user
    done(null, user);
  }
}
