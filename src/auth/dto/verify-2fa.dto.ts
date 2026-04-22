/**
 * ============================================================
 * DTO — Verify2faDto (Vérification du code de double authentification)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé lors de la vérification
 * du code 2FA après une tentative de connexion.
 *
 * 💡 Rappel : quand le 2FA est activé, la connexion se fait
 *    en deux étapes distinctes :
 *
 * 🔄 Flux de connexion avec 2FA activé :
 *    ─────────────────────────────────────────────────────
 *    Étape 1 — LoginDto :
 *       POST /auth/login { email, password }
 *       → le serveur vérifie les identifiants
 *       → comme le 2FA est activé, il retourne un message
 *         demandant le code Google Authenticator
 *         (pas de tokens JWT encore)
 *
 *    Étape 2 — Verify2faDto (ce DTO) :
 *       POST /auth/2fa/verify { email, code }
 *       → le serveur vérifie le code TOTP
 *       → si valide → retourne accessToken + refreshToken
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/2fa/verify
 *    {
 *      "email": "phanuel@example.com",
 *      "code": "847392"
 *    }
 *    ─────────────────────────────────────────
 *
 * 💡 Différence avec Enable2faDto :
 *    - Enable2faDto  → utilisé UNE SEULE FOIS pour activer
 *                      le 2FA (nécessite d'être connecté)
 *    - Verify2faDto  → utilisé À CHAQUE CONNEXION pour
 *                      valider le code (avant d'être connecté)
 *
 * 🛡️ Sécurité :
 *    Le code TOTP change toutes les 30 secondes et n'est
 *    valable qu'une seule fois. Une fenêtre de tolérance
 *    d'environ ±30 secondes est généralement acceptée
 *    pour compenser les décalages d'horloge.
 * ============================================================
 */

import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2faDto {
  /**
   * email — Adresse email du compte en cours de connexion
   *
   * 🛡️ Règles de validation :
   *    - @IsEmail()    → doit être une adresse email valide
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *
   * 💬 Messages d'erreur personnalisés via i18n :
   *    - Email invalide → clé 'validation.invalid_email'
   *    - Champ vide     → clé 'validation.required'
   *
   * 💡 L'email est requis ici car cette route est accessible
   *    sans être connecté (pas de JWT encore). Il permet
   *    d'identifier le compte dont on veut vérifier le 2FA.
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
   * code — Code TOTP à 6 chiffres
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
   * 💡 Différence avec @Length(6,6) utilisé dans Enable2faDto :
   *    @Matches(/^\d{6}$/) est plus strict car il vérifie
   *    aussi que tous les caractères sont bien des chiffres,
   *    pas uniquement la longueur.
   *
   * 💬 Message d'erreur personnalisé via i18n :
   *    - Code invalide → clé 'validation.invalid_2fa_code'
   *
   * 📄 Swagger : champ obligatoire avec un exemple de code TOTP
   */
  @ApiProperty({
    example: '847392',
    description: 'Code TOTP généré par Google Authenticator',
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  @Matches(/^\d{6}$/, {
    message: 'validation.invalid_2fa_code',
  })
  code!: string;
}
