/**
 * ============================================================
 * DTO — UpdateOrganizationDto (Mise à jour d'organisation)
 * ============================================================
 *
 * Ce DTO valide et documente les données reçues lors de la
 * mise à jour d'une organisation existante.
 *
 * 💡 C'est quoi un DTO ?
 *    Un Data Transfer Object définit la forme exacte des données
 *    attendues par un endpoint. Il sert à la fois de contrat
 *    d'API et de couche de validation automatique.
 *
 * ⚙️ Responsabilités :
 *    ─────────────────────────────────────────────────────
 *    - Validation des champs entrants via class-validator
 *    - Documentation Swagger via @ApiPropertyOptional
 *    - Typage strict TypeScript avec les enums Prisma
 *    ─────────────────────────────────────────────────────
 *
 * 🔐 Règles de validation :
 *    ─────────────────────────────────────────────────────
 *    - name     → optionnel, chaîne, 100 caractères max
 *    - planType → optionnel, doit être un PlanType valide
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Tous les champs sont optionnels — seuls les champs fournis
 *    sont mis à jour en base. La vérification des droits (OWNER/ADMIN)
 *    est effectuée dans OrganizationsService.update() et non ici.
 *
 * ============================================================
 */

import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '../../generated/prisma';

export class UpdateOrganizationDto {
  /**
   * name
   *
   * Nouveau nom affiché de l'organisation.
   *
   * 💡 Optionnel → si non fourni, le nom actuel est conservé.
   *
   * ⚙️ Contraintes :
   *    - Optionnel (@IsOptional)
   *    - Doit être une chaîne de caractères (@IsString)
   *    - 100 caractères maximum (@MaxLength)
   */
  @ApiPropertyOptional({ example: 'Mise à jour concernant Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /**
   * planType
   *
   * Nouveau type d'abonnement de l'organisation.
   *
   * 💡 Optionnel → si non fourni, le plan actuel est conservé.
   *    Permet de faire évoluer une organisation de FREE vers PRO
   *    ou ENTERPRISE sans recréer l'organisation.
   *
   * ⚙️ Contraintes :
   *    - Optionnel (@IsOptional)
   *    - Doit correspondre à un membre de l'enum PlanType (@IsEnum)
   *
   * @see PlanType → FREE | PRO | ENTERPRISE
   */
  @ApiPropertyOptional({ enum: PlanType })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;
}
