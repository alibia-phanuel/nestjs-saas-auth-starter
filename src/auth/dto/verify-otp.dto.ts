import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'phanuel@example.com' })
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '847392', description: 'OTP code received by email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}
