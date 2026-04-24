/**
 * ============================================================
 * DTO — AssignRoleDto (Attribution d'un rôle utilisateur)
 * ============================================================
 *
 * Ce DTO (Data Transfer Object) définit et valide les données
 * attendues lors de l'attribution d'un rôle à un utilisateur.
 *
 * 💡 C'est quoi un DTO ?
 *    Un DTO est un objet qui définit la forme des données
 *    transitant entre le client et le serveur. Il permet de :
 *    - Valider les données entrantes avant qu'elles atteignent
 *      le service (via class-validator)
 *    - Documenter automatiquement l'API (via @nestjs/swagger)
 *    - Typer strictement les données côté TypeScript
 *
 * 📋 Données attendues :
 *    {
 *      "roleName": "admin"
 *    }
 *
 * 🛡️ Validation appliquée :
 *    - roleName → string non vide obligatoire
 *
 * 💡 Exemple d'utilisation :
 *
 *    @Post(':id/roles')
 *    @UseGuards(JwtAuthGuard, RolesGuard)
 *    @Roles('admin')
 *    assignRole(
 *      @Param('id') userId: string,
 *      @Body() dto: AssignRoleDto,
 *    ) { ... }
 *
 * ============================================================
 */

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  /**
   * Nom du rôle à attribuer à l'utilisateur.
   *
   * 💡 Le nom du rôle doit correspondre exactement à un rôle
   *    existant en base de données (ex: 'admin', 'moderator').
   *    Une NotFoundException sera levée si le rôle est introuvable.
   *
   * @example "admin"
   *
   * @IsString()    → vérifie que la valeur est bien une chaîne
   * @IsNotEmpty()  → interdit les chaînes vides ("")
   */
  @ApiProperty({
    example: 'admin',
    description: 'Nom du rôle à attribuer',
  })
  @IsString()
  @IsNotEmpty()
  roleName!: string;
}
