/**
 * ============================================================
 * DTO — InviteMemberDto (Invitation d'un membre)
 * ============================================================
 *
 * Ce DTO valide et documente les données reçues lors de
 * l'invitation d'un nouvel utilisateur dans une organisation.
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
 *    - email → requis, doit être une adresse email valide
 *    - role  → optionnel, doit être un MemberRole valide
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Seuls les membres OWNER ou ADMIN peuvent envoyer une
 *    invitation — cette restriction est appliquée dans
 *    OrganizationsService.inviteMember() et non dans ce DTO.
 *
 * ============================================================
 */

import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '../../generated/prisma';

export class InviteMemberDto {
  /**
   * email
   *
   * Adresse email de la personne à inviter.
   *
   * 💡 L'email est utilisé pour envoyer le lien d'invitation
   *    via l'événement 'organization.invitation' émis par le service.
   *
   * ⚙️ Contraintes :
   *    - Requis (@IsNotEmpty)
   *    - Doit être une adresse email valide (@IsEmail)
   */
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  /**
   * role
   *
   * Rôle attribué à l'invité lors de l'acceptation de l'invitation.
   *
   * 💡 Optionnel → si non fourni, le membre sera créé avec
   *    le rôle par défaut défini dans le schema : MemberRole.MEMBER.
   *
   * ⚙️ Contraintes :
   *    - Optionnel (@IsOptional)
   *    - Doit correspondre à un membre de l'enum MemberRole (@IsEnum)
   *
   * @see MemberRole → OWNER | ADMIN | MEMBER
   */
  @ApiPropertyOptional({ enum: MemberRole, default: MemberRole.MEMBER })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}
