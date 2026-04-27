/**
 * ============================================================
 * GRAPHQL INPUTS — Authentification
 * ============================================================
 *
 * Les InputTypes sont l'équivalent GraphQL des DTOs REST.
 * Ils définissent la forme des arguments des mutations.
 *
 * 💡 Rappel Module 2 (00:48:10 Validate Request Body)
 *    class-validator fonctionne aussi avec GraphQL !
 *    Les décorateurs @IsEmail(), @MinLength()... valident
 *    les arguments avant que le resolver soit appelé.
 *
 * 💡 @InputType() vs @ObjectType() :
 *    - @InputType()  → argument d'entrée (mutation/query)
 *    - @ObjectType() → type de retour (response)
 *
 * Exemple d'utilisation dans un resolver :
 *    @Mutation(() => AuthResponse)
 *    async login(@Args('input') input: LoginInput) { ... }
 *
 * Requête GraphQL correspondante :
 *    mutation {
 *      login(input: { email: "...", password: "..." }) {
 *        accessToken
 *        refreshToken
 *      }
 *    }
 * ============================================================
 */

import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Length,
} from 'class-validator';

/**
 * SignupInput
 *
 * Arguments pour l'inscription d'un nouvel utilisateur.
 * Correspond au SignupDto REST mais adapté pour GraphQL.
 */
@InputType()
export class SignupInput {
  /** Email unique de l'utilisateur */
  @Field()
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty({ message: 'validation.required' })
  email!: string;

  /** Mot de passe — minimum 8 caractères */
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  @MinLength(8, { message: 'validation.password_too_short' })
  password!: string;

  /** Prénom — optionnel */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  /** Nom de famille — optionnel */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;
}

/**
 * LoginInput
 *
 * Arguments pour la connexion avec email + mot de passe.
 */
@InputType()
export class LoginInput {
  /** Email du compte */
  @Field()
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty({ message: 'validation.required' })
  email!: string;

  /** Mot de passe du compte */
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  password!: string;
}

/**
 * VerifyOtpInput
 *
 * Arguments pour la vérification du compte via OTP.
 * L'OTP est reçu par email après l'inscription.
 */
@InputType()
export class VerifyOtpInput {
  /** Email du compte à vérifier */
  @Field()
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty()
  email!: string;

  /** Code OTP à 6 chiffres reçu par email */
  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}

/**
 * ForgotPasswordInput
 *
 * Arguments pour la demande de réinitialisation de mot de passe.
 * Un OTP sera envoyé à l'adresse email fournie.
 */
@InputType()
export class ForgotPasswordInput {
  /** Email du compte à réinitialiser */
  @Field()
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty()
  email!: string;
}

/**
 * ResetPasswordInput
 *
 * Arguments pour définir un nouveau mot de passe.
 * Nécessite l'OTP reçu par email via forgotPassword.
 */
@InputType()
export class ResetPasswordInput {
  /** Email du compte */
  @Field()
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty()
  email!: string;

  /** Code OTP reçu par email */
  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;

  /** Nouveau mot de passe — minimum 8 caractères */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'validation.password_too_short' })
  newPassword!: string;
}

/**
 * RefreshTokenInput
 *
 * Arguments pour renouveler l'access token.
 * Le refresh token est fourni lors de la connexion.
 */
@InputType()
export class RefreshTokenInput {
  /** JWT Refresh Token obtenu lors du login */
  @Field()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

/**
 * Verify2FAInput
 *
 * Arguments pour vérifier le code 2FA après login.
 * Appelé quand login() retourne requiresTwoFactor: true.
 */
@InputType()
export class Verify2FAInput {
  /** Email du compte */
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  /** Code TOTP à 6 chiffres depuis Google Authenticator */
  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}

/**
 * Enable2FAInput
 *
 * Arguments pour activer ou désactiver le 2FA.
 * Nécessite un code TOTP valide pour confirmation.
 */
@InputType()
export class Enable2FAInput {
  /** Code TOTP à 6 chiffres depuis Google Authenticator */
  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}
