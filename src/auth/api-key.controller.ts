/**
 * ============================================================
 * CONTRÔLEUR — ApiKeyController (Gestion des clés API)
 * ============================================================
 *
 * Ce fichier définit le contrôleur qui expose les endpoints
 * REST pour la création, la liste, la révocation et le test
 * des clés API.
 *
 * 💡 C'est quoi un contrôleur dans NestJS ?
 *    Un contrôleur reçoit les requêtes HTTP entrantes,
 *    les délègue au service approprié et retourne la réponse.
 *    Il ne contient PAS de logique métier — c'est le rôle
 *    du service (ApiKeyService).
 *
 * 📋 Endpoints exposés :
 *    ─────────────────────────────────────────────────────
 *    POST   /auth/api-keys        → Créer une clé API
 *    GET    /auth/api-keys        → Lister ses clés API
 *    DELETE /auth/api-keys/:id    → Révoquer une clé API
 *    GET    /auth/api-keys/test   → Tester une clé API
 *    ─────────────────────────────────────────────────────
 *
 * 🛡️ Authentification requise :
 *    - POST / GET / DELETE → protégés par JwtAuthGuard
 *                            (token JWT dans Authorization: Bearer)
 *    - GET /test           → protégé par ApiKeyGuard
 *                            (clé API dans x-api-key)
 * ============================================================
 */

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
import type { JwtUser, ApiKeyCreated, ApiKeySafe } from './types/auth.types';

/**
 * @ApiTags('Clés API')
 * Regroupe tous les endpoints de ce contrôleur sous la
 * section "Clés API" dans la documentation Swagger (/api/docs).
 *
 * @Controller('auth/api-keys')
 * Préfixe toutes les routes de ce contrôleur avec /auth/api-keys.
 */
@ApiTags('Clés API')
@Controller('auth/api-keys')
export class ApiKeyController {
  /**
   * ApiKeyService est injecté automatiquement par NestJS
   * via le constructeur (injection de dépendances).
   * Le mot-clé private readonly garantit que le service
   * ne peut pas être réassigné après l'initialisation.
   */
  constructor(private readonly apiKeyService: ApiKeyService) {}

  // ══════════════════════════════════════════════════════════
  // 📌 POST /auth/api-keys — Créer une nouvelle clé API
  // ══════════════════════════════════════════════════════════

  /**
   * create()
   *
   * Crée une nouvelle clé API pour l'utilisateur connecté.
   *
   * 💡 La clé brute (rawKey) est retournée UNE SEULE FOIS
   *    dans cette réponse. Elle ne sera plus jamais accessible
   *    car seul son hash est stocké en base de données.
   *    L'utilisateur doit la copier immédiatement.
   *
   * @UseGuards(JwtAuthGuard)  → token JWT obligatoire
   * @ApiBearerAuth()          → documente l'auth JWT dans Swagger
   * @HttpCode(201)            → retourne 201 Created (pas 200)
   *
   * @param user → utilisateur connecté extrait du token JWT
   * @param dto  → données de création (name, expiresAt?)
   * @returns    → ApiKeyCreated contenant la rawKey (une seule fois)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle clé API' })
  @ApiResponse({
    status: 201,
    description: 'Clé API créée — la clé brute est affichée une seule fois',
    schema: {
      example: {
        id: 'uuid',
        name: 'Clé API Production',
        rawKey: 'sk_abc123...', // ⚠️ affichée UNE SEULE FOIS
        key: 'sk_****ef01', // version masquée pour identification
        isActive: true,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreated> {
    return this.apiKeyService.create(user.id, dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /auth/api-keys — Lister ses clés API
  // ══════════════════════════════════════════════════════════

  /**
   * findAll()
   *
   * Retourne la liste de toutes les clés API de l'utilisateur
   * connecté, sans jamais exposer la clé brute.
   *
   * 💡 On retourne ApiKeySafe[] et non ApiKeyCreated[] —
   *    la rawKey n'est JAMAIS retournée dans cette liste.
   *    L'utilisateur peut voir ses clés (nom, statut, dates)
   *    mais pas les régénérer depuis cette endpoint.
   *
   * @param user → utilisateur connecté extrait du token JWT
   * @returns    → tableau de ApiKeySafe (sans rawKey)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Lister toutes les clés API de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Liste des clés API (sans la clé brute)',
  })
  async findAll(@CurrentUser() user: JwtUser): Promise<ApiKeySafe[]> {
    return this.apiKeyService.findAllByUser(user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 DELETE /auth/api-keys/:id — Révoquer une clé API
  // ══════════════════════════════════════════════════════════

  /**
   * revoke()
   *
   * Révoque (désactive) une clé API identifiée par son id.
   * Une clé révoquée ne peut plus être utilisée pour s'authentifier.
   *
   * 💡 On passe à la fois keyId ET user.id au service pour
   *    s'assurer qu'un utilisateur ne peut révoquer que SES
   *    propres clés — pas celles d'un autre utilisateur.
   *
   * @param user  → utilisateur connecté extrait du token JWT
   * @param keyId → id de la clé à révoquer (depuis l'URL :id)
   * @returns     → message de confirmation
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Révoquer une clé API' })
  @ApiResponse({ status: 200, description: 'Clé API révoquée' })
  async revoke(
    @CurrentUser() user: JwtUser,
    @Param('id') keyId: string,
  ): Promise<{ message: string }> {
    return this.apiKeyService.revoke(keyId, user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /auth/api-keys/test — Tester une clé API
  // ══════════════════════════════════════════════════════════

  /**
   * testApiKey()
   *
   * Endpoint de test permettant de vérifier qu'une clé API
   * fonctionne correctement. Retourne un message de confirmation
   * et les informations de l'utilisateur associé à la clé.
   *
   * 💡 Cet endpoint utilise ApiKeyGuard (pas JwtAuthGuard) —
   *    l'authentification se fait via le header x-api-key
   *    et non via un token JWT Bearer.
   *
   *    Comment tester avec curl :
   *    ──────────────────────────────────────────────────
   *    curl -H "x-api-key: sk_abc123..." \
   *         http://localhost:3000/auth/api-keys/test
   *    ──────────────────────────────────────────────────
   *
   * @ApiSecurity('api-key') → documente l'auth par clé API
   *                           dans Swagger (champ x-api-key)
   *
   * @param user → utilisateur extrait de la clé API par ApiKeyGuard
   * @returns    → message de confirmation + infos utilisateur
   */
  @Get('test')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Tester votre clé API — envoyer le header x-api-key',
  })
  @ApiResponse({ status: 200, description: 'Clé API valide' })
  testApiKey(@CurrentUser() user: JwtUser): {
    message: string;
    user: JwtUser;
  } {
    return {
      message: 'Votre clé API est valide ✅',
      user,
    };
  }
}
