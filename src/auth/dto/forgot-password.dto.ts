import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'phanuel@example.com' })
  @IsEmail({}, { message: 'validation.invalid_email' })
  @IsNotEmpty()
  email!: string;
}
