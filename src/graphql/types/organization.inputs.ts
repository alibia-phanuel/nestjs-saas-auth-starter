/**
 * ============================================================
 * GRAPHQL INPUTS — Gestion des organisations
 * ============================================================
 *
 * InputTypes pour les opérations sur les organisations
 * (multi-tenancy SaaS) via l'API GraphQL.
 *
 * 💡 Rappel Module 3 (01:20:59 One To Many)
 *    Une organisation a plusieurs membres. Le créateur
 *    devient automatiquement OWNER lors de la création.
 * ============================================================
 */

import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PlanType, MemberRole } from '../../generated/prisma';

/**
 * CreateOrganizationInput
 *
 * Arguments pour créer une nouvelle organisation.
 * Le créateur devient automatiquement OWNER.
 */
@InputType()
export class CreateOrganizationInput {
  /** Nom de l'organisation ex: 'Acme Corp' */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /**
   * Slug unique ex: 'acme-corp'
   * Utilisé dans les URLs et comme identifiant lisible.
   * Doit être unique dans toute la plateforme.
   */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  slug!: string;

  /** Plan SaaS initial — FREE par défaut */
  @Field(() => PlanType, { nullable: true })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;
}

/**
 * UpdateOrganizationInput
 *
 * Arguments pour mettre à jour une organisation.
 * Réservé aux OWNER et ADMIN de l'organisation.
 */
@InputType()
export class UpdateOrganizationInput {
  /** Nouveau nom de l'organisation */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /** Nouveau plan SaaS */
  @Field(() => PlanType, { nullable: true })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;
}

/**
 * InviteMemberInput
 *
 * Arguments pour inviter un membre dans une organisation.
 * Un email d'invitation est envoyé automatiquement.
 * Réservé aux OWNER et ADMIN.
 */
@InputType()
export class InviteMemberInput {
  /** Email de la personne à inviter */
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  /** Rôle assigné — MEMBER par défaut */
  @Field(() => MemberRole, { nullable: true })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}
