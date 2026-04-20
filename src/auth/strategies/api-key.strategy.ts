/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async validate(req: Request): Promise<object> {
    // Extrait la clé du header x-api-key
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const user = await this.apiKeyService.validate(apiKey);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    return user;
  }
}
