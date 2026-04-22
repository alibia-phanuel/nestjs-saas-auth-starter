/**
 * ============================================================
 * DTO — VerifyOtpDto (Vérification du code OTP reçu par email)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé lors de la vérification
 * du code OTP envoyé par email après l'inscription.
 *
 * 💡 C'est quoi un OTP ?
 *    OTP = One-Time Password (mot de passe à usage unique).
 *    C'est un code à 6 chiffres généré aléatoirement,
 *    envoyé par email, valable une seule fois et pendant
 *    une durée limitée (ex: 10 minutes).
 *
 * 🔄 Flux de vérification OTP après inscription :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur s'inscrit via POST /auth/signup
 *       → le serveur génère un OTP et l'envoie par email
 *       → le compte est créé avec le statut PENDING
 *    2. L'utilisateur reçoit l'email avec le code OTP
 *    3. Il envoie POST /auth/verify-otp avec ce DTO
 *       → le serveur vérifie l'email + l'OTP
 *    4. Si valide → le compte passe de PENDING à ACTIVE
 *       emailVerified passe à true et l'OTP est effacé
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/verify-otp
 *    {
 *      "email": "phanuel@example.com",
 *      "otp": "847392"
 *    }
 *    ─────────────────────────────────────────
 *
 * 💡 Différence avec Verify2faDto :
 *    - VerifyOtpDto  → vérifie un code envoyé par EMAIL
 *                      pour activer le compte à l'inscription
 *                      ou réinitialiser le mot de passe
 *    - Verify2faDto  → vérifie un code généré par une APPLICATION
 *                      (Google Authenticator) à chaque connexion
 *
 * 🛡️ Sécurité :
 *    L'OTP est à usage unique — il est effacé de la base
 *    dès qu'il est utilisé avec succès. S'il est expiré,
 *    l'utilisateur doit en demander un nouveau.
 * ============================================================
 */

import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  /**
   * email — Adresse email du compte à activer
   *
   * 🛡️ Règles de validation :
   *    - @IsEmail()    → doit être une adresse email valide
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Messages d'erreur personnalisés via i18n :
   *    - Email invalide → clé 'validation.invalid_email'
   *    - Champ vide     → clé 'validation.required'
   *
   * 💡 L'email est requis pour croiser l'OTP avec le bon
   *    compte en base de données. Deux utilisateurs différents
   *    pourraient théoriquement avoir le même OTP au même
   *    moment — l'email garantit l'unicité de la vérification.
   *
   * 📄 Swagger : champ obligatoire avec un exemple d'email
   */
  @ApiProperty({
    example: 'phanuel@example.com',
    description: 'Adresse e-mail',
  })
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty({ message: 'validation.required' })
  email!: string;

  /**
   * otp — Code à 6 chiffres reçu par email
   *
   * 🛡️ Règles de validation :
   *    - @IsString()   → doit être une chaîne de caractères
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *    - @Matches()    → doit correspondre à l'expression
   *                      régulière /^\d{6}$/
   *
   * 💡 Explication de l'expression régulière /^\d{6}$/ :
   *    ^     → début de la chaîne
   *    \d    → un chiffre (0-9)
   *    {6}   → exactement 6 fois
   *    $     → fin de la chaîne
   *    → Accepte uniquement : "847392", "000000", "123456"
   *    → Rejette : "84739" (5 chiffres), "84739a" (lettre),
   *                " 847392" (espace), "8473921" (7 chiffres)
   *
   * 💡 L'OTP est traité comme une string et non un number
   *    car il peut commencer par 0 (ex: "047392") — un nombre
   *    perdrait ce zéro initial et fausserait la comparaison.
   *
   * 💬 Message d'erreur personnalisé via i18n :
   *    - Code invalide → clé 'validation.invalid_otp'
   *
   * 📄 Swagger : champ obligatoire avec un exemple de code OTP
   */
  @ApiProperty({
    example: '847392',
    description: 'Code OTP reçu par e-mail',
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  @Matches(/^\d{6}$/, {
    message: 'validation.invalid_otp',
  })
  otp!: string;
}
