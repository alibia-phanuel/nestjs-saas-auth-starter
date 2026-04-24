/**
 * ============================================================
 * TYPES — users.types.ts (Définitions de types du module Users)
 * ============================================================
 *
 * Ce fichier centralise tous les types et interfaces utilisés
 * dans le module Users et ses dépendances.
 *
 * 💡 Pourquoi centraliser les types ?
 *    - Éviter la duplication de définitions entre fichiers
 *    - Garantir la cohérence des structures de données
 *    - Faciliter la maintenance lors des évolutions du schéma
 *    - Permettre l'import ciblé avec "import type { ... }"
 *
 * 📋 Types exportés :
 *    ─────────────────────────────────────────────────────
 *    JwtUser          → payload extrait du token JWT
 *    SafeUser         → utilisateur sans données sensibles
 *    MessageResponse  → réponse API standardisée avec clé i18n
 *    RequestUser      → utilisateur attaché à la requête HTTP
 *    RequestWithUser  → requête HTTP typée avec user
 *    PrismaUserMinimal → utilisateur minimal pour les mocks
 *    PrismaRole        → rôle minimal pour les mocks
 *    PrismaUserRole    → relation user-role pour les mocks
 *    ─────────────────────────────────────────────────────
 *
 * ============================================================
 */

// ══════════════════════════════════════════════════════════
// 📌 TYPES — Authentification JWT
// ══════════════════════════════════════════════════════════

/**
 * Payload extrait du token JWT après validation.
 *
 * 💡 Ce type est utilisé par le décorateur @CurrentUser()
 *    pour typer l'utilisateur injecté dans les controllers.
 *    Il ne contient que les informations minimales nécessaires
 *    pour identifier l'utilisateur dans une requête.
 *
 * 🔗 Utilisé dans :
 *    - JwtStrategy.validate()
 *    - @CurrentUser() decorator
 *    - Controllers nécessitant l'id de l'utilisateur connecté
 */
export interface JwtUser {
  id: string;
  email: string;
}

// ══════════════════════════════════════════════════════════
// 📌 TYPES — Utilisateur sécurisé
// ══════════════════════════════════════════════════════════

/**
 * Représentation d'un utilisateur sans données sensibles.
 *
 * 💡 Ce type garantit que le mot de passe et autres données
 *    confidentielles ne sont JAMAIS exposés dans les réponses
 *    API — même accidentellement.
 *
 * 📋 Champs inclus :
 *    - Informations de base      → id, email, firstName, lastName
 *    - Statut du compte          → status, emailVerified
 *    - Sécurité                  → twoFactorEnabled
 *    - Métadonnées               → createdAt
 *    - Relations (optionnelles)  → roles avec permissions
 *
 * ⚠️ Le champ roles est optionnel car certaines requêtes
 *    (update, delete) ne retournent pas les relations.
 *
 * 🔗 Utilisé dans :
 *    - UsersService.findAll()
 *    - UsersService.findOne()
 *    - UsersService.update()
 */
export interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  roles?: Array<{
    role: { name: string; permissions: Array<{ action: string }> };
  }>;
}

// ══════════════════════════════════════════════════════════
// 📌 TYPES — Réponses API standardisées
// ══════════════════════════════════════════════════════════

/**
 * Format standard des réponses API contenant un message i18n.
 *
 * 💡 Toutes les réponses de confirmation (création, suppression,
 *    mise à jour) utilisent ce format pour permettre au frontend
 *    de retraduire le message dans la langue de l'utilisateur
 *    via la clé, tout en ayant le message traduit disponible.
 *
 * 📋 Format de sortie :
 *    {
 *      "key":     "users.deleted",         ← clé i18n pour le frontend
 *      "message": "Compte supprimé"        ← message traduit par le backend
 *    }
 *
 * 🔗 Utilisé dans :
 *    - UsersService.remove()
 *    - UsersService.assignRole()
 *    - UsersService.removeRole()
 */
export interface MessageResponse {
  key: string;
  message: string;
}

// ══════════════════════════════════════════════════════════
// 📌 TYPES — Requête HTTP authentifiée
// ══════════════════════════════════════════════════════════

/**
 * Utilisateur attaché à la requête HTTP après authentification.
 *
 * 💡 Contrairement à JwtUser, RequestUser inclut les rôles
 *    car il est utilisé par RolesGuard pour vérifier les
 *    permissions d'accès aux routes protégées.
 *
 * 🔗 Utilisé dans :
 *    - RolesGuard.canActivate()
 *    - RequestWithUser
 */
export interface RequestUser {
  id: string;
  email: string;
  roles: Array<{ role: { name: string } }>;
}

/**
 * Requête HTTP Express typée avec l'utilisateur authentifié.
 *
 * 💡 Ce type étend implicitement la requête Express standard
 *    en ajoutant la propriété user peuplée par JwtAuthGuard.
 *    Il permet d'accéder à request.user de manière typée
 *    sans recourir à des casts manuels.
 *
 * 🔗 Utilisé dans :
 *    - RolesGuard.canActivate()
 *    - Tout middleware nécessitant request.user typé
 */
export interface RequestWithUser {
  user: RequestUser;
}

// ══════════════════════════════════════════════════════════
// 📌 TYPES — Structures Prisma pour les tests unitaires
// ══════════════════════════════════════════════════════════

/**
 * Utilisateur minimal retourné par Prisma.
 *
 * 💡 Utilisé dans findUnique() pour les vérifications d'existence
 *    avant update/delete — pas besoin de tous les champs SafeUser.
 *    Tous les champs sauf id et email sont optionnels car Prisma
 *    ne sélectionne que ce qui est demandé dans la requête.
 *
 * 🔗 Utilisé dans :
 *    - Mocks de tests unitaires (users.service.spec.ts)
 *    - UsersService.update() avant la mise à jour
 *    - UsersService.remove() avant la suppression
 */
export type PrismaUserMinimal = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: Date;
};

/**
 * Rôle minimal retourné par Prisma.
 *
 * 💡 Utilisé dans assignRole() et removeRole() pour vérifier
 *    l'existence du rôle avant de créer ou supprimer la relation
 *    UserRole. Seuls l'id et le name sont nécessaires.
 *
 * 🔗 Utilisé dans :
 *    - Mocks de tests unitaires (users.service.spec.ts)
 *    - UsersService.assignRole()
 *    - UsersService.removeRole()
 */
export type PrismaRole = {
  id: string;
  name: string;
};

/**
 * Relation UserRole retournée par Prisma.
 *
 * 💡 Représente l'entrée de la table de jonction entre
 *    un utilisateur et un rôle. Utilisé dans les mocks
 *    pour simuler les opérations create/delete sur userRole.
 *
 * 🔗 Utilisé dans :
 *    - Mocks de tests unitaires (users.service.spec.ts)
 *    - UsersService.assignRole()
 *    - UsersService.removeRole()
 */
export type PrismaUserRole = {
  userId: string;
  roleId: string;
};
