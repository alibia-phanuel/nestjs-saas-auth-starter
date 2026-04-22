/**
 * ============================================================
 * TYPES PARTAGÉS — auth.types.ts
 * ============================================================
 *
 * Ce fichier centralise tous les types et interfaces TypeScript
 * utilisés dans le module d'authentification.
 *
 * 💡 C'est quoi une interface TypeScript ?
 *    Une interface définit la "forme" d'un objet — elle liste
 *    ses propriétés et leurs types. TypeScript vérifie que
 *    chaque objet respecte bien cette forme à la compilation,
 *    ce qui évite les erreurs de typage à l'exécution.
 *
 * 💡 Pourquoi centraliser les types dans un seul fichier ?
 *    - Évite la duplication : on définit chaque type une seule fois
 *    - Facilite la maintenance : une modification = un seul endroit
 *    - Améliore la lisibilité : on sait où chercher un type
 *    - Garantit la cohérence : tous les fichiers utilisent
 *      les mêmes définitions
 *
 * 📋 Types définis dans ce fichier :
 *    - Setup2FAResult  → résultat de la configuration 2FA
 *    - MessageResponse → réponse générique avec clé i18n
 *    - AuthTokens      → paire de tokens JWT
 *    - JwtPayload      → contenu décodé d'un token JWT
 *    - ApiKeyCreated   → clé API retournée à la création
 *    - ApiKeySafe      → clé API retournée dans les listes
 *    - JwtUser         → utilisateur injecté dans req.user
 *    - ValidatedUser   → utilisateur après validation login
 *    - GoogleProfile   → profil brut retourné par Google OAuth
 *    - GoogleUser      → profil Google structuré pour l'app
 * ============================================================
 */

// ── Types partagés Auth ───────────────────────────────

/**
 * Setup2FAResult
 *
 * Résultat retourné lors de la configuration initiale
 * de la double authentification (POST /auth/2fa/setup).
 *
 * - secret     → clé secrète partagée entre le serveur et
 *                Google Authenticator, stockée en base de données
 * - otpauthUrl → URL otpauth:// encodée dans le QR code
 *                (ex: otpauth://totp/MonApp:email@ex.com?secret=...)
 * - qrCode     → image QR code en base64 à afficher à l'utilisateur
 *                (ex: data:image/png;base64,iVBORw0KGgo...)
 */
export interface Setup2FAResult {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
}

/**
 * MessageResponse
 *
 * Réponse générique retournée par les endpoints qui
 * n'ont pas de données à retourner (confirmation d'action).
 *
 * - key     → clé de traduction i18n (ex: 'auth.signup_success')
 *             utilisée par le frontend pour afficher le bon message
 *             dans la bonne langue
 * - message → message traduit ou clé brute si i18n non configuré
 *
 * Exemples d'utilisation :
 * { key: 'auth.signup_success', message: 'Inscription réussie' }
 * { key: 'auth.api_key_revoked', message: 'Clé API révoquée' }
 */
export interface MessageResponse {
  key: string;
  message: string;
}

/**
 * AuthTokens
 *
 * Paire de tokens JWT retournée après une connexion réussie.
 *
 * - accessToken  → token de courte durée (ex: 15 minutes)
 *                  envoyé dans chaque requête protégée :
 *                  Authorization: Bearer <accessToken>
 * - refreshToken → token de longue durée (ex: 7 jours)
 *                  utilisé uniquement pour renouveler
 *                  l'accessToken via POST /auth/refresh
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * JwtPayload
 *
 * Contenu décodé d'un token JWT après vérification
 * de sa signature. C'est ce que JwtStrategy reçoit
 * dans sa méthode validate().
 *
 * - sub   → "subject" — identifiant unique de l'utilisateur
 *           (convention JWT standard pour l'id utilisateur)
 * - email → adresse email de l'utilisateur
 *
 * 💡 Le payload est encodé dans le token mais PAS chiffré —
 *    il est lisible par quiconque possède le token.
 *    Ne jamais y mettre de données sensibles (mot de passe...).
 */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * ApiKeyCreated
 *
 * Données retournées UNIQUEMENT lors de la création
 * d'une nouvelle clé API (POST /auth/api-keys).
 *
 * - id        → identifiant unique de la clé en base
 * - name      → nom donné à la clé (ex: 'Production API')
 * - rawKey    → clé en clair (ex: sk_abc123...)
 *               ⚠️ Affichée UNE SEULE FOIS — jamais stockée
 *               en clair, jamais retournée dans les autres
 *               endpoints (uniquement à la création)
 * - key       → version masquée (ex: sk_****ef01)
 *               affichée dans les listes pour identification
 * - isActive  → true si la clé est active
 * - expiresAt → date d'expiration (null = pas d'expiration)
 * - createdAt → date de création
 */
export interface ApiKeyCreated {
  id: string;
  name: string;
  rawKey: string;
  key: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * ApiKeySafe
 *
 * Données retournées lors de la liste des clés API
 * (GET /auth/api-keys) — version sécurisée sans rawKey.
 *
 * 💡 Différence avec ApiKeyCreated :
 *    - Pas de rawKey → la clé brute n'est JAMAIS ré-affichée
 *    - Pas de key    → la version masquée non plus
 *    - Ajout de lastUsed → utile pour auditer l'usage des clés
 *
 * - id       → identifiant unique de la clé
 * - name     → nom de la clé
 * - isActive → statut actif/révoqué
 * - lastUsed → dernière utilisation (null = jamais utilisée)
 * - expiresAt → date d'expiration (null = pas d'expiration)
 * - createdAt → date de création
 */
export interface ApiKeySafe {
  id: string;
  name: string;
  isActive: boolean;
  lastUsed: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * JwtUser
 *
 * Représentation de l'utilisateur authentifié injectée
 * dans req.user par JwtStrategy et ApiKeyStrategy.
 * Accessible dans les contrôleurs via @CurrentUser().
 *
 * 💡 On ne met ici que le strict minimum nécessaire —
 *    pas de mot de passe, pas de secret 2FA, pas de données
 *    sensibles. Ces données sont exclues volontairement
 *    dans le select de JwtStrategy.validate().
 */
export interface JwtUser {
  id: string;
  email: string;
}

/**
 * ValidatedUser
 *
 * Utilisateur retourné après validation des identifiants
 * lors de la connexion (login). Contient plus d'informations
 * que JwtUser car on en a besoin pour vérifier le statut
 * du compte avant de générer les tokens.
 *
 * - id            → identifiant unique
 * - email         → adresse email
 * - status        → statut du compte : 'ACTIVE' | 'PENDING' | 'SUSPENDED'
 * - emailVerified → true si l'email a été confirmé
 */
export interface ValidatedUser {
  id: string;
  email: string;
  status: string;
  emailVerified: boolean;
}

// ── Types OAuth Google ────────────────────────────────

/**
 * GoogleProfile
 *
 * Profil brut retourné par Google OAuth après authentification.
 * C'est la structure exacte que passport-google-oauth20
 * transmet à GoogleStrategy.validate().
 *
 * - id      → identifiant unique Google (providerId)
 * - emails  → tableau d'emails (on utilise toujours emails[0])
 *             verified: true si Google a confirmé l'email
 * - name    → objet contenant prénom et nom de famille
 * - photos  → tableau de photos de profil (on utilise photos[0])
 *
 * 💡 Google peut retourner plusieurs emails et photos,
 *    c'est pourquoi ce sont des tableaux. On prend toujours
 *    le premier élément (index 0) qui est le principal.
 */
export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: { givenName: string; familyName: string };
  photos: Array<{ value: string }>;
}

/**
 * GoogleUser
 *
 * Profil Google structuré et simplifié, construit à partir
 * de GoogleProfile dans GoogleStrategy.validate().
 * C'est cet objet qui est injecté dans req.user après
 * l'authentification Google et transmis à OAuthService.
 *
 * - providerId → id unique Google (pour identifier le compte
 *                OAuth en base et éviter les doublons)
 * - email      → adresse email Google
 * - firstName  → prénom (name.givenName)
 * - lastName   → nom de famille (name.familyName)
 * - photo      → URL de la photo de profil Google
 *                ('' si aucune photo disponible)
 */
export interface GoogleUser {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  photo: string;
}
