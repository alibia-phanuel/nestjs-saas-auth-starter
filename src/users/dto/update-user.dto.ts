/**
 * ============================================================
 * DTO — UpdateUserDto (Mise à jour du profil utilisateur)
 * ============================================================
 *
 * Ce DTO définit et valide les données attendues lors de la
 * mise à jour du profil d'un utilisateur.
 *
 * 💡 Tous les champs sont optionnels (Partial update) —
 *    l'utilisateur peut modifier un seul champ à la fois
 *    sans avoir à renvoyer l'intégralité de son profil.
 *
 * 📋 Données acceptées :
 *    {
 *      "firstName": "Phanuel",   // optionnel
 *      "lastName":  "Tsopze",    // optionnel
 *      "status":    "ACTIVE"     // optionnel
 *    }
 *
 * 🛡️ Validation appliquée :
 *    - firstName → string, max 50 caractères, optionnel
 *    - lastName  → string, max 50 caractères, optionnel
 *    - status    → valeur de l'enum UserStatus, optionnel
 *
 * ⚠️ Restriction métier :
 *    Un utilisateur ne peut modifier que son propre profil.
 *    La vérification est effectuée dans UsersService.update()
 *    et non dans ce DTO.
 *
 * 💡 Exemple d'utilisation :
 *
 *    @Patch(':id')
 *    @UseGuards(JwtAuthGuard)
 *    update(
 *      @Param('id') id: string,
 *      @Body() dto: UpdateUserDto,
 *    ) { ... }
 *
 * ============================================================
 */

import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../generated/prisma';

export class UpdateUserDto {
  /**
   * Prénom de l'utilisateur.
   *
   * 💡 Limité à 50 caractères pour éviter les abus
   *    et garantir la cohérence avec le schéma Prisma.
   *
   * @example "Phanuel"
   *
   * @IsOptional()      → le champ peut être absent de la requête
   * @IsString()        → vérifie que la valeur est une chaîne
   * @MaxLength(50)     → interdit les chaînes de plus de 50 caractères
   */
  @ApiPropertyOptional({ example: 'Phanuel' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  /**
   * Nom de famille de l'utilisateur.
   *
   * 💡 Même contraintes que firstName — optionnel et
   *    limité à 50 caractères.
   *
   * @example "Tsopze"
   *
   * @IsOptional()      → le champ peut être absent de la requête
   * @IsString()        → vérifie que la valeur est une chaîne
   * @MaxLength(50)     → interdit les chaînes de plus de 50 caractères
   */
  @ApiPropertyOptional({ example: 'Tsopze' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  /**
   * Statut du compte utilisateur.
   *
   * 💡 Restreint aux valeurs de l'enum UserStatus défini
   *    par Prisma — toute autre valeur sera rejetée par
   *    la validation avant d'atteindre le service.
   *
   * 📋 Valeurs possibles (depuis UserStatus) :
   *    - ACTIVE   → compte actif et utilisable
   *    - INACTIVE → compte désactivé temporairement
   *    - BANNED   → compte banni définitivement
   *
   * @IsOptional()       → le champ peut être absent de la requête
   * @IsEnum(UserStatus) → vérifie que la valeur appartient à l'enum
   */
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
