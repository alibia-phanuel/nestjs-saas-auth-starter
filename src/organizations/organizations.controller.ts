/**
 * ============================================================
 * CONTRÔLEUR — OrganizationsController (Gestion des organisations)
 * ============================================================
 *
 * Ce contrôleur expose les endpoints REST pour la gestion
 * des organisations : création, consultation, mise à jour,
 * suppression, gestion des membres et invitations.
 *
 * 💡 C'est quoi un contrôleur dans NestJS ?
 *    Un contrôleur reçoit les requêtes HTTP, les délègue
 *    au service (OrganizationsService) et formate la réponse.
 *    Il ne contient **aucune logique métier** — tout est dans le service.
 *
 * 📋 Endpoints exposés :
 *    ─────────────────────────────────────────────────────
 *    POST   /organizations                  → Créer une organisation
 *    GET    /organizations                  → Lister mes organisations
 *    GET    /organizations/:id              → Voir une organisation
 *    PATCH  /organizations/:id              → Mettre à jour (owner/admin)
 *    DELETE /organizations/:id              → Supprimer (owner uniquement)
 *    POST   /organizations/:id/invite       → Inviter un membre (owner/admin)
 *    GET    /organizations/accept/:token    → Accepter une invitation
 *    DELETE /organizations/:id/members/:userId → Retirer un membre (owner/admin)
 *    ─────────────────────────────────────────────────────
 *
 * 🛡️ Authentification :
 *    - Toutes les routes → protégées par JwtAuthGuard
 *    - Certaines routes → vérifient en plus les droits (propriétaire ou admin de l’orga)
 *
 * ⚠️ Restrictions métier importantes :
 *    - Seuls le propriétaire et les administrateurs peuvent modifier/supprimer l’organisation
 *    - Un utilisateur ne peut voir que les organisations dont il est membre
 *    - Les invitations sont gérées via un token sécurisé
 *
 * ============================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
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
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from './types/organizations.types';

/**
 * @ApiTags('Organizations')
 * Regroupe tous les endpoints sous la section "Organizations" dans Swagger.
 *
 * @Controller('organizations')
 * Toutes les routes sont préfixées par /organizations.
 *
 * @UseGuards(JwtAuthGuard)
 * Toutes les routes nécessitent un token JWT valide.
 *
 * @ApiBearerAuth('access-token')
 * Indique dans Swagger que l’authentification JWT est requise.
 */
@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ══════════════════════════════════════════════════════════
  // 📌 POST /organizations — Créer une organisation
  // ══════════════════════════════════════════════════════════

  /**
   * Crée une nouvelle organisation pour l'utilisateur connecté.
   *
   * L'utilisateur devient automatiquement le propriétaire de l'organisation.
   *
   * @param user - Utilisateur connecté (extrait du JWT)
   * @param dto  - Données de création (nom, pseudonyme, etc.)
   * @returns    - L'organisation créée
   * @throws ConflictException si le pseudonyme est déjà utilisé
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle organisation' })
  @ApiResponse({ status: 201, description: 'Organisation créée avec succès' })
  @ApiResponse({ status: 409, description: 'Ce pseudonyme est déjà pris' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /organizations — Lister mes organisations
  // ══════════════════════════════════════════════════════════

  /**
   * Retourne la liste de toutes les organisations dont l'utilisateur connecté est membre.
   *
   * @param user - Utilisateur connecté
   * @returns    - Liste des organisations de l'utilisateur
   */
  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les organisations de l'utilisateur actuel",
  })
  @ApiResponse({ status: 200, description: 'Liste des organisations' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.organizationsService.findAllByUser(user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /organizations/:id — Voir une organisation
  // ══════════════════════════════════════════════════════════

  /**
   * Retourne les détails d'une organisation.
   *
   * L'utilisateur doit être membre de l'organisation pour y accéder.
   *
   * @param id   - Identifiant de l'organisation
   * @param user - Utilisateur connecté
   * @returns    - Détails de l'organisation
   * @throws ForbiddenException si l'utilisateur n'est pas membre
   * @throws NotFoundException si l'organisation n'existe pas
   */
  @Get(':id')
  @ApiOperation({ summary: "Obtenir les détails d'une organisation" })
  @ApiResponse({ status: 200, description: "Détails de l'organisation" })
  @ApiResponse({
    status: 403,
    description: "Vous n'êtes pas membre de cette organisation",
  })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.organizationsService.findOne(id, user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 PATCH /organizations/:id — Mettre à jour
  // ══════════════════════════════════════════════════════════

  /**
   * Met à jour les informations d'une organisation.
   *
   * Réservé aux propriétaires et administrateurs de l'organisation.
   *
   * @param id   - Identifiant de l'organisation
   * @param user - Utilisateur connecté (doit avoir les droits)
   * @param dto  - Données de mise à jour
   * @returns    - Organisation mise à jour
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Mettre à jour une organisation — réservé aux propriétaires/administrateurs',
  })
  @ApiResponse({ status: 200, description: 'Organisation mise à jour' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, user.id, dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 DELETE /organizations/:id — Supprimer l'organisation
  // ══════════════════════════════════════════════════════════

  /**
   * Supprime définitivement une organisation.
   *
   * Réservé uniquement au propriétaire de l'organisation.
   *
   * ⚠️ Cette action est irréversible et supprime toutes les données associées.
   *
   * @param id   - Identifiant de l'organisation
   * @param user - Utilisateur connecté (doit être le propriétaire)
   * @returns    - Message de confirmation
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer une organisation — réservé au propriétaire',
  })
  @ApiResponse({ status: 200, description: 'Organisation supprimée' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.organizationsService.remove(id, user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /organizations/:id/invite — Inviter un membre
  // ══════════════════════════════════════════════════════════

  /**
   * Envoie une invitation à rejoindre une organisation.
   *
   * Réservé aux propriétaires et administrateurs.
   *
   * @param id   - Identifiant de l'organisation
   * @param user - Utilisateur connecté (doit avoir les droits)
   * @param dto  - Informations de l'invitation (email, rôle, etc.)
   * @returns    - Message de confirmation
   */
  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inviter un membre — réservé aux propriétaires/administrateurs',
  })
  @ApiResponse({ status: 200, description: 'Invitation envoyée' })
  inviteMember(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(id, user.id, dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /organizations/accept/:token — Accepter une invitation
  // ══════════════════════════════════════════════════════════

  /**
   * Accepte une invitation à rejoindre une organisation via un token.
   *
   * Cette route permet à un utilisateur d'accepter une invitation reçue par email.
   *
   * @param token - Token d'invitation unique et sécurisé
   * @param user  - Utilisateur connecté qui accepte l'invitation
   * @returns     - Message de confirmation
   * @throws ForbiddenException si le token est invalide ou expiré
   */
  @Get('accept/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accepter une invitation à rejoindre une organisation',
  })
  @ApiResponse({ status: 200, description: 'Invitation acceptée avec succès' })
  @ApiResponse({ status: 403, description: 'Invitation non valide ou périmée' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.organizationsService.acceptInvitation(token, user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 DELETE /organizations/:id/members/:userId — Retirer un membre
  // ══════════════════════════════════════════════════════════

  /**
   * Retire un membre d'une organisation.
   *
   * Réservé aux propriétaires et administrateurs de l'organisation.
   *
   * @param orgId        - Identifiant de l'organisation
   * @param targetUserId - Identifiant de l'utilisateur à retirer
   * @param user         - Utilisateur connecté (doit avoir les droits)
   * @returns            - Message de confirmation
   */
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un membre — réservé aux propriétaires/administrateurs',
  })
  @ApiResponse({
    status: 200,
    description: 'Membre supprimé de l’organisation',
  })
  removeMember(
    @Param('id') orgId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.organizationsService.removeMember(orgId, user.id, targetUserId);
  }
}
