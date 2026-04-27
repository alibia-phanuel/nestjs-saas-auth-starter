export interface JwtUser {
  id: string;
  email: string;
}

// ── Types stricts ─────────────────────────────────────

export interface MessageResponse {
  key: string;
  message: string;
}
/**
 * ============================================================
 * TYPES — Organizations (Interfaces et types partagés)
 * ============================================================
 *
 * Ce fichier centralise les types TypeScript partagés entre
 * le controller et le service du module Organizations.
 *
 * 💡 Pourquoi des types centralisés ?
 *    Évite la duplication de types entre le controller, le service
 *    et les guards. Un seul fichier à modifier si le contrat change.
 *
 * ⚙️ Contenu :
 *    ─────────────────────────────────────────────────────
 *    - JwtUser       → payload extrait du token JWT
 *    - MessageResponse → réponse standardisée avec clé i18n
 *    ─────────────────────────────────────────────────────
 *
 * ============================================================
 */

// ══════════════════════════════════════════════════════════
// 📌 JwtUser — Payload JWT
// ══════════════════════════════════════════════════════════

/**
 * JwtUser
 *
 * Représente le payload extrait du token JWT après validation
 * par le guard d'authentification.
 *
 * 💡 Injecté via @CurrentUser() dans les controllers
 *    pour identifier l'utilisateur à l'origine de la requête.
 *
 * ⚙️ Champs :
 *    - id    → identifiant unique de l'utilisateur (UUID)
 *    - email → adresse email de l'utilisateur connecté
 */
export interface JwtUser {
  id: string;
  email: string;
}

// ══════════════════════════════════════════════════════════
// 📌 MessageResponse — Réponse i18n standardisée
// ══════════════════════════════════════════════════════════

/**
 * MessageResponse
 *
 * Structure de réponse standardisée retournée par les endpoints
 * qui n'ont pas de données à renvoyer (création, suppression, invitation…).
 *
 * 💡 Générée par I18nService.createResponse(key) → garantit que
 *    tous les messages de l'API sont internationalisables.
 *
 * ⚙️ Champs :
 *    - key     → clé i18n (ex: 'organizations.invitation_sent')
 *    - message → message traduit selon la langue de la requête
 */
export interface MessageResponse {
  key: string;
  message: string;
}
