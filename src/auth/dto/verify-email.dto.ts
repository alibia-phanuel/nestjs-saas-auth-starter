import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'abc123xyz',
    description: 'Email verification token received by email',
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.required' })
  token!: string;
}
