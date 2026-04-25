/**
 * ============================================================
 * GRAPHQL TYPES — AuthResponse & MessageResponse
 * ============================================================
 *
 * Ces types définissent la forme des réponses GraphQL pour
 * les opérations d'authentification.
 *
 * 💡 Rappel Module 14 (09:13:43 Define Queries and Mutations)
 *    @ObjectType() → équivalent d'une interface TypeScript
 *    mais pour GraphQL. NestJS génère automatiquement le
 *    schéma SDL depuis ces décorateurs.
 *
 *    Exemple de schéma généré :
 *    type AuthResponse {
 *      key: String!
 *      message: String!
 *      accessToken: String
 *      refreshToken: String
 *      requiresTwoFactor: Boolean
 *      email: String
 *    }
 * ============================================================
 */

import { ObjectType, Field } from '@nestjs/graphql';

/**
 * AuthResponse
 *
 * Type de retour unifié pour toutes les mutations d'auth.
 * Certains champs sont nullable (?) car ils ne sont pas
 * toujours présents selon le contexte :
 *
 * - Signup   → key + message (pas de tokens)
 * - Login    → key + message + accessToken + refreshToken
 * - 2FA req  → key + message + requiresTwoFactor + email
 */
@ObjectType()
export class AuthResponse {
  /** Clé i18n pour traduction frontend ex: 'auth.login_success' */
  @Field()
  key!: string;

  /** Message traduit en fallback ex: 'Login successful' */
  @Field()
  message!: string;

  /** JWT Access Token — présent après login réussi sans 2FA */
  @Field({ nullable: true })
  accessToken?: string;

  /** JWT Refresh Token — présent après login réussi sans 2FA */
  @Field({ nullable: true })
  refreshToken?: string;

  /**
   * Indicateur 2FA requis
   * true → le frontend doit appeler mutation { verify2FA }
   * avant d'obtenir les tokens JWT
   */
  @Field({ nullable: true })
  requiresTwoFactor?: boolean;

  /** Email retourné quand requiresTwoFactor est true */
  @Field({ nullable: true })
  email?: string;
}

/**
 * MessageResponse
 *
 * Type générique pour les réponses simples qui ne
 * retournent qu'un message de confirmation.
 * Utilisé par : verifyOtp, forgotPassword, resetPassword...
 */
@ObjectType()
export class MessageResponse {
  /** Clé i18n pour traduction frontend */
  @Field()
  key!: string;

  /** Message traduit en fallback */
  @Field()
  message!: string;
}
