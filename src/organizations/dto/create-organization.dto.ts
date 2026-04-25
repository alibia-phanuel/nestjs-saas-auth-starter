/**
 * ============================================================
 * DTO — CreateOrganizationDto (Création d'organisation)
 * ============================================================
 *
 * Ce DTO valide et documente les données reçues lors de la
 * création d'une nouvelle organisation.
 *
 * 💡 C'est quoi un DTO ?
 *    Un Data Transfer Object définit la forme exacte des données
 *    attendues par un endpoint. Il sert à la fois de contrat
 *    d'API et de couche de validation automatique.
 *
 * ⚙️ Responsabilités :
 *    ─────────────────────────────────────────────────────
 *    - Validation des champs entrants via class-validator
 *    - Documentation Swagger via @ApiProperty
 *    - Typage strict TypeScript avec les enums Prisma
 *    ─────────────────────────────────────────────────────
 *
 * 🔐 Règles de validation :
 *    ─────────────────────────────────────────────────────
 *    - name     → requis, chaîne, 100 caractères max
 *    - slug     → requis, chaîne, 50 caractères max
 *    - planType → optionnel, doit être un PlanType valide
 *    ─────────────────────────────────────────────────────
 *
 * ============================================================
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '../../generated/prisma';

export class CreateOrganizationDto {
  /**
   * name
   *
   * Nom affiché de l'organisation.
   *
   * ⚙️ Contraintes :
   *    - Requis (@IsNotEmpty)
   *    - Doit être une chaîne de caractères (@IsString)
   *    - 100 caractères maximum (@MaxLength)
   */
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /**
   * slug
   *
   * Identifiant unique lisible de l'organisation, utilisé dans les URLs.
   *
   * 💡 Le slug doit être unique en base — la vérification d'unicité
   *    est effectuée dans OrganizationsService.create() via Prisma.
   *
   * ⚙️ Contraintes :
   *    - Requis (@IsNotEmpty)
   *    - Doit être une chaîne de caractères (@IsString)
   *    - 50 caractères maximum (@MaxLength)
   */
  @ApiProperty({
    example: 'acme-corp',
    description: "Identifiant unique pour l'organisation",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  slug!: string;

  /**
   * planType
   *
   * Type d'abonnement de l'organisation.
   *
   * 💡 Optionnel → si non fourni, Prisma applique la valeur
   *    par défaut définie dans le schema : PlanType.FREE.
   *
   * ⚙️ Contraintes :
   *    - Optionnel (@IsOptional)
   *    - Doit correspondre à un membre de l'enum PlanType (@IsEnum)
   *
   * @see PlanType → FREE | PRO | ENTERPRISE
   */
  @ApiPropertyOptional({ enum: PlanType, default: PlanType.FREE })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;
}
