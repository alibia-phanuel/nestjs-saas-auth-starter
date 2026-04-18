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
  @ApiProperty({
    example: 'phanuel@example.com',
    description: "Adresse email de l'utilisateur",
  })
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty({ message: 'validation.required' })
  email!: string;

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

  @ApiPropertyOptional({
    example: 'Phanuel',
    description: "Prénom de l'utilisateur",
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Tsopze',
    description: "Nom de famille de l'utilisateur",
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
