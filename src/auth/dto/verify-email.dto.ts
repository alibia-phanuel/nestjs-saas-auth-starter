/**
 * ============================================================
 * DTO — VerifyEmailDto (Vérification de l'adresse email)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé lors de la vérification
 * de l'adresse email après l'inscription d'un utilisateur.
 *
 * 💡 Rappel : à l'inscription, le compte est créé avec le
 *    statut PENDING. L'utilisateur doit vérifier son email
 *    avant de pouvoir se connecter.
 *
 * 🔄 Flux de vérification d'email :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur s'inscrit via POST /auth/signup
 *       → un email est envoyé avec un lien de vérification
 *         contenant le token (ex: /auth/verify-email?token=abc123)
 *    2. L'utilisateur clique sur le lien
 *       → le frontend envoie POST /auth/verify-email avec ce DTO
 *    3. Le serveur vérifie le token en base de données
 *    4. Si valide → le compte passe de PENDING à ACTIVE
 *       et emailVerified passe à true
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/verify-email
 *    {
 *      "token": "abc123xyz"
 *    }
 *    ─────────────────────────────────────────
 *
 * 💡 Différence avec VerifyOtpDto :
 *    - VerifyOtpDto   → vérifie un code à 6 chiffres (OTP)
 *                       envoyé par email à l'inscription
 *    - VerifyEmailDto → vérifie un token alphanumérique
 *                       envoyé dans un lien de confirmation
 *
 * 🛡️ Sécurité :
 *    Le token est à usage unique et a une durée de validité
 *    limitée. Ces vérifications sont faites côté service.
 *    Si le token est expiré, l'utilisateur doit en demander
 *    un nouveau.
 * ============================================================
 */

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  /**
   * token — Token de vérification reçu par email
   *
   * 🛡️ Règles de validation :
   *    - @IsString()   → doit être une chaîne de caractères
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Message d'erreur personnalisé via i18n :
   *    - Champ vide → clé 'validation.required' traduite
   *                   selon la langue de l'utilisateur
   *
   * 💡 Le token est une chaîne alphanumérique unique générée
   *    côté serveur lors de l'inscription. Sa validité
   *    (existence en base, expiration, usage unique) est
   *    vérifiée côté service — pas dans ce DTO qui valide
   *    uniquement que le champ est présent et est une chaîne.
   *
   * 📄 Swagger : champ obligatoire avec un exemple de token
   *
   * Le ! signifie que TypeScript garantit que cette propriété
   * sera toujours définie après validation par NestJS.
   */
  @ApiProperty({
    example: 'abc123xyz',
    description: "Token de vérification d'e-mail reçu par e-mail",
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  token!: string;
}
