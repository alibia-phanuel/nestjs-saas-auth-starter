/**
 * ============================================================
 * DTO — SignupDto (Inscription d'un nouvel utilisateur)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé lors de l'inscription
 * d'un nouvel utilisateur dans l'application.
 *
 * 🔄 Flux d'inscription :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur envoie POST /auth/signup avec ce DTO
 *    2. Le serveur vérifie que l'email n'est pas déjà utilisé
 *    3. Le mot de passe est hashé avec bcrypt avant stockage
 *    4. Le compte est créé avec le statut PENDING
 *    5. Un OTP à 6 chiffres est généré et envoyé par email
 *    6. L'utilisateur vérifie son email via POST /auth/verify-otp
 *       → son compte passe alors au statut ACTIVE
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/signup
 *    {
 *      "email": "phanuel@example.com",
 *      "password": "SecurePass123!",
 *      "firstName": "Phanuel",
 *      "lastName": "Tsopze"
 *    }
 *    ─────────────────────────────────────────
 *
 * 💡 Différence avec LoginDto :
 *    - SignupDto valide la complexité du mot de passe
 *      (longueur min/max) car c'est ici qu'on le crée
 *    - LoginDto ne valide pas la complexité car le mot
 *      de passe existe déjà — on le compare simplement
 *
 * 🛡️ Sécurité :
 *    Si l'email est déjà utilisé, une erreur 409 (Conflict)
 *    est retournée. Le mot de passe n'est jamais retourné
 *    dans la réponse, même hashé.
 * ============================================================
 */

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  /**
   * email — Adresse email du nouveau compte
   *
   * 🛡️ Règles de validation :
   *    - @IsEmail()    → doit être une adresse email valide
   *                      (format: xxx@xxx.xxx)
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Messages d'erreur personnalisés via i18n :
   *    - Email invalide → clé 'validation.invalid_email'
   *    - Champ vide     → clé 'validation.required'
   *
   * 💡 Cet email servira d'identifiant unique — deux comptes
   *    ne peuvent pas avoir le même email (vérifié en base).
   *
   * 📄 Swagger : champ obligatoire avec un exemple d'email
   *
   * Le ! signifie que TypeScript garantit que cette propriété
   * sera toujours définie après validation par NestJS.
   */
  @ApiProperty({
    example: 'phanuel@example.com',
    description: "Adresse email de l'utilisateur",
  })
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty({ message: 'validation.required' })
  email!: string;

  /**
   * password — Mot de passe du nouveau compte
   *
   * 🛡️ Règles de validation :
   *    - @IsString()    → doit être une chaîne de caractères
   *    - @IsNotEmpty()  → ne peut pas être vide ou null
   *    - @MinLength(8)  → 8 caractères minimum
   *    - @MaxLength(64) → 64 caractères maximum
   *
   * 💬 Messages d'erreur personnalisés via i18n :
   *    - Champ vide  → clé 'validation.required'
   *    - Trop court  → clé 'validation.password_too_short'
   *
   * 💡 Pourquoi une longueur maximale de 64 ?
   *    bcrypt (l'algorithme de hashage utilisé) tronque
   *    silencieusement les mots de passe à 72 caractères.
   *    On limite à 64 pour éviter ce comportement inattendu
   *    et prévenir les attaques par mots de passe très longs
   *    qui pourraient saturer le serveur (DoS).
   *
   * 📄 Swagger : champ obligatoire avec longueur minimale affichée
   */
  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Mot de passe — minimum 8 caractères',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  @MinLength(8, { message: 'validation.password_too_short' })
  @MaxLength(64)
  password!: string;

  /**
   * firstName — Prénom de l'utilisateur (optionnel)
   *
   * 🛡️ Règles de validation :
   *    - @IsOptional() → le champ peut être absent du body
   *    - @IsString()   → si présent, doit être une chaîne
   *
   * 💡 Le prénom est optionnel à l'inscription — l'utilisateur
   *    peut le renseigner plus tard dans son profil.
   *
   * 📄 Swagger : champ optionnel avec un exemple de prénom
   *
   * Le ? signifie que cette propriété peut être undefined
   * (non fournie dans la requête).
   */
  @ApiPropertyOptional({
    example: 'Phanuel',
    description: "Prénom de l'utilisateur",
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  /**
   * lastName — Nom de famille de l'utilisateur (optionnel)
   *
   * 🛡️ Règles de validation :
   *    - @IsOptional() → le champ peut être absent du body
   *    - @IsString()   → si présent, doit être une chaîne
   *
   * 💡 Comme le prénom, le nom de famille est optionnel
   *    à l'inscription et peut être ajouté plus tard.
   *
   * 📄 Swagger : champ optionnel avec un exemple de nom
   */
  @ApiPropertyOptional({
    example: 'Tsopze',
    description: "Nom de famille de l'utilisateur",
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
