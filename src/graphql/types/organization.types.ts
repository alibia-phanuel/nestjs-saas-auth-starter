/**
 * ============================================================
 * GRAPHQL TYPES — OrganizationType, OrganizationMemberType
 * ============================================================
 *
 * Ces types représentent les organisations (multi-tenancy SaaS)
 * dans l'API GraphQL.
 *
 * 💡 Rappel Module 3 (01:20:59 One To Many Relation)
 *    Organization → OrganizationMember → User
 *    Une organisation a plusieurs membres, chaque membre
 *    a un rôle dans l'organisation (OWNER, ADMIN, MEMBER).
 *
 * 💡 registerEnumType() → nécessaire pour exposer les enums
 *    Prisma dans GraphQL. Sans ça, GraphQL ne reconnaît pas
 *    PlanType et MemberRole comme types valides.
 * ============================================================
 */

import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { PlanType, MemberRole } from '../../generated/prisma';

/**
 * Enregistrement des enums Prisma pour GraphQL
 *
 * 💡 registerEnumType() → convertit un enum TypeScript en
 *    type enum GraphQL. Sans ça, NestJS ne sait pas comment
 *    sérialiser ces valeurs dans le schéma SDL.
 *
 * Schéma généré :
 *    enum PlanType { FREE PRO ENTERPRISE }
 *    enum MemberRole { OWNER ADMIN MEMBER }
 */
registerEnumType(PlanType, {
  name: 'PlanType',
  description: 'SaaS subscription plan type',
});

registerEnumType(MemberRole, {
  name: 'MemberRole',
  description: 'Role of a member within an organization',
});

/**
 * OrganizationMemberType
 *
 * Représente un membre d'une organisation avec son rôle.
 * Rappel Module 5 (02:24:14 Many to Many) — relation
 * many-to-many entre User et Organization via OrganizationMember.
 */
@ObjectType()
export class OrganizationMemberType {
  /** UUID du membre */
  @Field(() => ID)
  id!: string;

  /** UUID de l'utilisateur membre */
  @Field()
  userId!: string;

  /**
   * Rôle dans l'organisation :
   * OWNER  → créateur, tous les droits
   * ADMIN  → peut gérer les membres
   * MEMBER → accès en lecture
   */
  @Field(() => MemberRole)
  role!: MemberRole;

  /** Date d'adhésion à l'organisation */
  @Field()
  joinedAt!: Date;
}

/**
 * OrganizationType
 *
 * Type GraphQL principal pour une organisation.
 * Correspond au model Organization de Prisma.
 *
 * 💡 Multi-tenancy SaaS :
 *    Chaque organisation a son propre plan (FREE/PRO/ENTERPRISE)
 *    et ses propres membres. Les données sont isolées par org.
 */
@ObjectType()
export class OrganizationType {
  /** UUID de l'organisation */
  @Field(() => ID)
  id!: string;

  /** Nom de l'organisation ex: 'Acme Corp' */
  @Field()
  name!: string;

  /** Slug unique ex: 'acme-corp' (utilisé dans les URLs) */
  @Field()
  slug!: string;

  /**
   * Plan SaaS actuel :
   * FREE       → fonctionnalités de base
   * PRO        → fonctionnalités avancées
   * ENTERPRISE → fonctionnalités complètes
   */
  @Field(() => PlanType)
  planType!: PlanType;

  /** Liste des membres de l'organisation */
  @Field(() => [OrganizationMemberType], { nullable: true })
  members?: OrganizationMemberType[];

  /** Date de création de l'organisation */
  @Field()
  createdAt!: Date;
}
