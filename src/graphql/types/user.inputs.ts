/**
 * ============================================================
 * GRAPHQL INPUTS — Gestion utilisateurs
 * ============================================================
 *
 * InputTypes pour les opérations de modification
 * des profils utilisateurs via l'API GraphQL.
 *
 * 💡 Rappel Module 2 (00:48:10) — class-validator
 *    Les validations fonctionnent identiquement en REST et GraphQL.
 *    La validation est appliquée automatiquement par NestJS
 *    avant l'exécution du resolver.
 * ============================================================
 */

import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * UpdateUserInput
 *
 * Arguments pour mettre à jour le profil utilisateur.
 * Tous les champs sont optionnels — on met à jour
 * uniquement ce qui est fourni (PATCH behavior).
 */
@InputType()
export class UpdateUserInput {
  /** Nouveau prénom — max 50 caractères */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  /** Nouveau nom de famille — max 50 caractères */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}
