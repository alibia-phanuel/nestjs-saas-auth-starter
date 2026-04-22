/**
 * ============================================================
 * DTO — LoginDto (Connexion d'un utilisateur)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé lors de la connexion
 * d'un utilisateur avec son email et son mot de passe.
 *
 * 🔄 Flux de connexion :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur envoie POST /auth/login avec ce DTO
 *    2. Le serveur vérifie que l'email existe en base
 *    3. Le serveur compare le mot de passe avec le hash
 *    4. Si tout est correct → retourne accessToken + refreshToken
 *    5. Si le 2FA est activé → retourne un message demandant
 *       le code Google Authenticator (pas de tokens encore)
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/login
 *    {
 *      "email": "phanuel@example.com",
 *      "password": "SecurePass123!"
 *    }
 *    ─────────────────────────────────────────
 *
 * 🛡️ Sécurité :
 *    En cas d'échec (email inexistant ou mot de passe incorrect),
 *    le serveur retourne toujours le même message d'erreur générique.
 *    Cela empêche un attaquant de savoir si c'est l'email ou le
 *    mot de passe qui est incorrect (protection contre l'énumération).
 * ============================================================
 */

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  /**
   * email — Adresse email du compte
   *
   * 🛡️ Règles de validation :
   *    - @IsEmail()    → doit être une adresse email valide
   *                      (format: xxx@xxx.xxx)
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Messages d'erreur personnalisés en français :
   *    - Email invalide  → 'Adresse e-mail invalide'
   *    - Champ vide      → 'Ce champ est obligatoire'
   *
   * 📄 Swagger : champ obligatoire avec un exemple d'email
   *
   * Le ! signifie que TypeScript garantit que cette propriété
   * sera toujours définie après validation par NestJS.
   */
  @ApiProperty({
    example: 'phanuel@example.com',
    description: 'Adresse e-mail',
  })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @IsNotEmpty({ message: 'Ce champ est obligatoire' })
  email!: string;

  /**
   * password — Mot de passe du compte
   *
   * 🛡️ Règles de validation :
   *    - @IsString()   → doit être une chaîne de caractères
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Message d'erreur personnalisé :
   *    - Champ vide → 'Ce champ est obligatoire'
   *
   * 📄 Swagger : champ obligatoire avec un exemple de mot de passe
   *
   * 💡 Aucune règle de complexité ici (longueur minimale,
   *    majuscules, chiffres...) car ces règles sont appliquées
   *    uniquement à l'inscription (SignupDto) — pas à la connexion.
   *    Un mot de passe existant doit pouvoir être soumis tel quel.
   */
  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Mot de passe utilisateur',
  })
  @IsString()
  @IsNotEmpty({ message: 'Ce champ est obligatoire' })
  password!: string;
}
