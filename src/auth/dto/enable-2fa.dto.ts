/**
 * ============================================================
 * DTO — Enable2faDto (Activation de la double authentification)
 * ============================================================
 *
 * Ce fichier définit le DTO utilisé lors de l'activation
 * de la double authentification (2FA) par l'utilisateur.
 *
 * 💡 C'est quoi le 2FA (double authentification) ?
 *    Le 2FA ajoute une couche de sécurité supplémentaire :
 *    en plus du mot de passe, l'utilisateur doit saisir
 *    un code à 6 chiffres généré par une application comme
 *    Google Authenticator. Ce code change toutes les 30 secondes.
 *
 * 🔄 Flux d'activation du 2FA :
 *    ─────────────────────────────────────────────────────
 *    1. L'utilisateur appelle POST /auth/2fa/setup
 *       → reçoit un QR code à scanner
 *    2. Il scanne le QR code avec Google Authenticator
 *    3. Il appelle POST /auth/2fa/enable avec ce DTO
 *       → envoie le code généré par l'application
 *    4. Le serveur vérifie le code et active le 2FA
 *    ─────────────────────────────────────────────────────
 *
 *    Exemple de body JSON attendu :
 *    ─────────────────────────────────────────
 *    POST /auth/2fa/enable
 *    {
 *      "code": "847392"
 *    }
 *    ─────────────────────────────────────────
 *
 * 🛡️ Pourquoi valider la longueur exacte à 6 ?
 *    Les codes TOTP font toujours exactement 6 chiffres.
 *    Accepter un code de longueur différente n'aurait
 *    aucun sens et pourrait indiquer une erreur de saisie.
 * ============================================================
 */

import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2faDto {
  /**
   * code — Code TOTP à 6 chiffres
   *
   * 🛡️ Règles de validation :
   *    - @IsString()   → doit être une chaîne de caractères
   *    - @IsNotEmpty() → ne peut pas être vide ou null
   *    - @Length(6, 6) → doit faire exactement 6 caractères
   *                      (ni plus, ni moins)
   *
   * 📄 Swagger : champ obligatoire avec un exemple de code
   *
   * 💡 Le code est traité comme une string et non un number
   *    car il peut commencer par 0 (ex: "047392") — un nombre
   *    perdrait ce zéro initial.
   *
   * Le ! signifie que TypeScript garantit que cette propriété
   * sera toujours définie après validation par NestJS.
   */
  @ApiProperty({
    example: '847392',
    description: 'Code TOTP généré par Google Authenticator',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  code!: string;
}
