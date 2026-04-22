/**
 * ============================================================
 * DTO — ForgotPasswordDto (Demande de réinitialisation de mot de passe)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé quand un utilisateur
 * a oublié son mot de passe et veut en définir un nouveau.
 *
 * 💡 Rappel : c'est quoi un DTO ?
 *    Un DTO (Data Transfer Object) définit la forme exacte
 *    des données attendues dans le body d'une requête HTTP.
 *    Il valide et documente automatiquement l'API.
 *
 * 🔄 Flux de réinitialisation du mot de passe :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur appelle POST /auth/forgot-password
 *       avec ce DTO → envoie son email
 *    2. Le serveur génère un OTP à 6 chiffres et l'envoie
 *       par email à l'utilisateur
 *    3. L'utilisateur appelle POST /auth/reset-password
 *       avec l'OTP reçu + son nouveau mot de passe
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/forgot-password
 *    {
 *      "email": "phanuel@example.com"
 *    }
 *    ─────────────────────────────────────────
 *
 * 🛡️ Bonne pratique de sécurité :
 *    Que l'email existe ou non en base de données, le serveur
 *    retourne toujours la même réponse de succès. Cela empêche
 *    un attaquant de deviner quels emails sont enregistrés
 *    dans l'application (protection contre l'énumération).
 * ============================================================
 */

import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  /**
   * email — Adresse email du compte à réinitialiser
   *
   * 🛡️ Règles de validation :
   *    - @IsEmail()    → doit être une adresse email valide
   *                      (format: xxx@xxx.xxx)
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Message d'erreur personnalisé :
   *    Si l'email est invalide, le message retourné est
   *    la clé i18n 'validation.invalid_email' qui sera
   *    traduite selon la langue de l'utilisateur.
   *
   * 📄 Swagger : champ obligatoire avec un exemple d'email
   *
   * Le ! signifie que TypeScript garantit que cette propriété
   * sera toujours définie après validation par NestJS.
   */
  @ApiProperty({ example: 'phanuel@example.com' })
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty()
  email!: string;
}
