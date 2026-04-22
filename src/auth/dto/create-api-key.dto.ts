/**
 * ============================================================
 * DTO — CreateApiKeyDto (Création d'une clé API)
 * ============================================================
 *
 * Ce fichier définit le DTO (Data Transfer Object) utilisé
 * lors de la création d'une clé API.
 *
 * 💡 C'est quoi un DTO ?
 *    Un DTO est un objet qui définit la forme exacte des données
 *    attendues dans le corps (body) d'une requête HTTP.
 *    Il sert à deux choses :
 *    1. Valider les données entrantes (via class-validator)
 *    2. Documenter l'API automatiquement (via Swagger)
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/api-keys
 *    {
 *      "name": "Clé API Production",
 *      "expiresAt": "2027-01-01T00:00:00.000Z"
 *    }
 *    ─────────────────────────────────────────
 *
 * 🛡️ Validation automatique :
 *    Grâce au ValidationPipe global (configuré dans main.ts),
 *    NestJS valide automatiquement chaque requête entrante
 *    selon les règles définies ici. Si une règle n'est pas
 *    respectée, une erreur 400 (Bad Request) est retournée.
 *
 * 📄 Documentation Swagger :
 *    Les décorateurs @ApiProperty et @ApiPropertyOptional
 *    génèrent automatiquement la documentation interactive
 *    accessible sur /api/docs.
 * ============================================================
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  /**
   * name — Nom de la clé API
   *
   * 🛡️ Règles de validation :
   *    - @IsString()   → doit être une chaîne de caractères
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *    - @MaxLength()  → 100 caractères maximum
   *
   * 📄 Swagger : champ obligatoire, affiché avec un exemple
   *
   * Le ! après name signifie que TypeScript garantit que
   * cette propriété sera toujours définie (assignée par NestJS
   * après validation).
   */
  @ApiProperty({
    example: 'Clé API Production',
    description: 'Nom de cette clé API',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /**
   * expiresAt — Date d'expiration de la clé (optionnelle)
   *
   * 🛡️ Règles de validation :
   *    - @IsOptional()    → le champ peut être absent du body
   *    - @IsDateString()  → si présent, doit être une date ISO 8601
   *                         (ex: "2027-01-01T00:00:00.000Z")
   *
   * 📄 Swagger : champ optionnel, affiché avec un exemple de date
   *
   * Le ? signifie que cette propriété peut être undefined
   * (non fournie dans la requête).
   *
   * 💡 Si absent → la clé n'expire jamais (expiresAt: null en base)
   *    Si présent → la clé sera automatiquement invalidée après
   *                 cette date lors de la validation
   */
  @ApiPropertyOptional({
    example: '2027-01-01T00:00:00.000Z',
    description: "Date d'expiration (optionnelle)",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
