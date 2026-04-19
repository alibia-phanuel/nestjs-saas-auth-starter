import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2faDto {
  @ApiProperty({ example: 'phanuel@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '847392',
    description: 'TOTP code from Google Authenticator',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}
