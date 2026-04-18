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
    description: 'Email address of the user',
  })
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty({ message: 'validation.required' })
  email!: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password — minimum 8 characters',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  @MinLength(8, { message: 'validation.password_too_short' })
  @MaxLength(64)
  password!: string;

  @ApiPropertyOptional({
    example: 'Phanuel',
    description: 'First name',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Tsopze',
    description: 'Last name',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
