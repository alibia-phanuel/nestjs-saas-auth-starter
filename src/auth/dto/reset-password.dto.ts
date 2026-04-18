import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'phanuel@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '847392' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'validation.password_too_short' })
  newPassword!: string;
}
