/**
 * ============================================================
 * DTO — RefreshTokenDto (Renouvellement des tokens JWT)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé quand un utilisateur
 * veut renouveler son accessToken expiré.
 *
 * 💡 Rappel : c'est quoi un accessToken et un refreshToken ?
 *    - accessToken  → token de courte durée (ex: 15 minutes)
 *                     envoyé dans le header de chaque requête
 *                     pour prouver que l'utilisateur est connecté
 *    - refreshToken → token de longue durée (ex: 7 jours)
 *                     utilisé UNIQUEMENT pour obtenir un nouvel
 *                     accessToken quand celui-ci est expiré
 *
 * 🔄 Flux de renouvellement :
 *    ─────────────────────────────────────────────────────
 *    1. L'accessToken expire (erreur 401 sur une requête)
 *    2. Le client envoie POST /auth/refresh avec ce DTO
 *       → envoie le refreshToken stocké localement
 *    3. Le serveur vérifie que le refreshToken est :
 *       - valide (existe en base)
 *       - non révoqué (isRevoked: false)
 *       - non expiré (expiresAt dans le futur)
 *    4. Si tout est correct → retourne un nouvel accessToken
 *       et un nouveau refreshToken (rotation des tokens)
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/refresh
 *    {
 *      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *    }
 *    ─────────────────────────────────────────
 *
 * 🛡️ Bonne pratique — Rotation des tokens :
 *    À chaque renouvellement, l'ancien refreshToken est révoqué
 *    et un nouveau est généré. Cela limite la fenêtre d'attaque
 *    si un refreshToken venait à être compromis.
 * ============================================================
 */

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  /**
   * refreshToken — Token de rafraîchissement JWT
   *
   * 🛡️ Règles de validation :
   *    - @IsString()   → doit être une chaîne de caractères
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Message d'erreur personnalisé via i18n :
   *    - Champ vide → clé 'validation.required' traduite
   *                   selon la langue de l'utilisateur
   *
   * 📄 Swagger : champ obligatoire avec un exemple de token JWT
   *             (tronqué pour la lisibilité avec '...')
   *
   * 💡 Le refreshToken est un JWT signé — sa validité est
   *    vérifiée côté service (existence en base, expiration,
   *    révocation) et non dans ce DTO qui valide uniquement
   *    que le champ est présent et est une chaîne de caractères.
   *
   * Le ! signifie que TypeScript garantit que cette propriété
   * sera toujours définie après validation par NestJS.
   */
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de rafraîchissement valide',
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  refreshToken!: string;
}
