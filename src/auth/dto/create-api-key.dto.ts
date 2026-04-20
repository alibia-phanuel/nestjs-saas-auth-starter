import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'Production API',
    description: 'Name for this API key',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: '2027-01-01T00:00:00.000Z',
    description: 'Expiration date (optional)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
