/**
 * ============================================================
 * DTO — ResetPasswordDto (Réinitialisation du mot de passe)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé quand un utilisateur
 * veut définir un nouveau mot de passe après avoir reçu
 * son code OTP par email.
 *
 * 💡 Ce DTO est la deuxième étape du flux de réinitialisation.
 *    Il regroupe les trois informations nécessaires pour
 *    réinitialiser un mot de passe en toute sécurité :
 *    l'identité (email), la preuve (OTP) et le nouveau secret
 *    (newPassword).
 *
 * 🔄 Flux complet de réinitialisation :
 *    ─────────────────────────────────────────────────────
 *    Étape 1 — ForgotPasswordDto :
 *       POST /auth/forgot-password { email }
 *       → le serveur envoie un OTP à 6 chiffres par email
 *
 *    Étape 2 — ResetPasswordDto (ce DTO) :
 *       POST /auth/reset-password { email, otp, newPassword }
 *       → le serveur vérifie l'OTP et met à jour le mot de passe
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/reset-password
 *    {
 *      "email": "phanuel@example.com",
 *      "otp": "847392",
 *      "newPassword": "NewSecurePass123!"
 *    }
 *    ─────────────────────────────────────────
 *
 * 🛡️ Sécurité :
 *    L'OTP est à usage unique et expiré après utilisation.
 *    Il a également une durée de validité limitée (ex: 10 min).
 *    Ces vérifications sont faites côté service, pas dans ce DTO.
 * ============================================================
 */

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  /**
   * email — Adresse email du compte à réinitialiser
   *
   * 🛡️ Règles de validation :
   *    - @IsEmail()    → doit être une adresse email valide
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💡 L'email est requis ici pour identifier le compte
   *    concerné et le croiser avec l'OTP en base de données.
   *
   * 📄 Swagger : champ obligatoire avec un exemple d'email
   */
  @ApiProperty({ example: 'phanuel@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  /**
   * otp — Code de vérification à 6 chiffres
   *
   * 🛡️ Règles de validation :
   *    - @IsString()   → doit être une chaîne de caractères
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *    - @Length(6, 6) → doit faire exactement 6 caractères
   *
   * 💡 L'OTP est traité comme une string et non un number
   *    car il peut commencer par 0 (ex: "047392") — un nombre
   *    perdrait ce zéro initial et fausserait la comparaison.
   *
   * 📄 Swagger : champ obligatoire avec un exemple d'OTP
   */
  @ApiProperty({ example: '847392' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;

  /**
   * newPassword — Nouveau mot de passe souhaité
   *
   * 🛡️ Règles de validation :
   *    - @IsString()    → doit être une chaîne de caractères
   *    - @IsNotEmpty()  → ne peut pas être vide ou null
   *    - @MinLength(8)  → 8 caractères minimum
   *
   * 💬 Message d'erreur personnalisé via i18n :
   *    - Trop court → clé 'validation.password_too_short'
   *                   traduite selon la langue de l'utilisateur
   *
   * 💡 On n'impose pas de règles supplémentaires ici
   *    (majuscules, chiffres, caractères spéciaux) mais
   *    il est recommandé de le faire en production pour
   *    garantir des mots de passe suffisamment robustes.
   *
   * 📄 Swagger : champ obligatoire avec un exemple de mot de passe
   */
  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'validation.password_too_short' })
  newPassword!: string;
}
