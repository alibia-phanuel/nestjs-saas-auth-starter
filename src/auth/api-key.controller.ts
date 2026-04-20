/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtUser } from './types/auth.types';

@ApiTags('API Keys')
@Controller('auth/api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  // ── POST /auth/api-keys ────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created — rawKey shown only once',
    schema: {
      example: {
        id: 'uuid',
        name: 'Production API',
        rawKey: 'sk_abc123...', // ← affiché UNE SEULE FOIS
        key: 'sk_****ef01',
        isActive: true,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateApiKeyDto,
  ): Promise<unknown> {
    return this.apiKeyService.create(user.id, dto);
  }

  // ── GET /auth/api-keys ─────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiResponse({ status: 200, description: 'List of API keys (no raw key)' })
  async findAll(@CurrentUser() user: JwtUser): Promise<unknown[]> {
    return this.apiKeyService.findAllByUser(user.id);
  }
  // ── DELETE /auth/api-keys/:id ──────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revoke(@CurrentUser() user: JwtUser, @Param('id') keyId: string) {
    return this.apiKeyService.revoke(keyId, user.id);
  }

  // ── GET /auth/api-keys/test ────────────────────
  // Endpoint de test pour vérifier qu'une API key fonctionne

  @Get('test')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Test your API key — sends x-api-key header' })
  @ApiResponse({ status: 200, description: 'API key is valid' })
  testApiKey(@CurrentUser() user: unknown) {
    return {
      message: 'Your API key is valid ✅',
      user,
    };
  }
}
