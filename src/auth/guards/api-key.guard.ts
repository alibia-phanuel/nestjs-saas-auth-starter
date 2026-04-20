import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Rappel Module 6 — Guard réutilisable
// @UseGuards(ApiKeyGuard) sur un endpoint = x-api-key obligatoire
@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {}
