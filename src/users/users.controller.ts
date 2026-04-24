/**
 * ============================================================
 * CONTRÔLEUR — UsersController (Gestion des utilisateurs)
 * ============================================================
 *
 * Ce contrôleur expose les endpoints REST pour la gestion
 * des utilisateurs : consultation, mise à jour, suppression
 * et attribution des rôles.
 *
 * 💡 C'est quoi un contrôleur dans NestJS ?
 *    Un contrôleur reçoit les requêtes HTTP entrantes,
 *    les délègue au service approprié et retourne la réponse.
 *    Il ne contient PAS de logique métier — c'est le rôle
 *    du service (UsersService).
 *
 * 📋 Endpoints exposés :
 *    ─────────────────────────────────────────────────────
 *    GET    /users              → Lister tous les utilisateurs (admin)
 *    GET    /users/me           → Profil de l'utilisateur connecté
 *    GET    /users/:id          → Récupérer un utilisateur (admin)
 *    PATCH  /users/:id          → Mettre à jour son profil
 *    DELETE /users/:id          → Supprimer son compte
 *    POST   /users/:id/roles    → Attribuer un rôle (admin)
 *    DELETE /users/:id/roles    → Retirer un rôle (admin)
 *    ─────────────────────────────────────────────────────
 *
 * 🛡️ Authentification :
 *    - Toutes les routes → protégées par JwtAuthGuard (au niveau classe)
 *    - Routes admin      → protégées en plus par RolesGuard + @Roles('admin')
 *
 * ⚠️ Restriction métier :
 *    - Un utilisateur ne peut modifier/supprimer QUE son propre compte
 *    - La vérification est effectuée dans UsersService (pas ici)
 *    - Les admins peuvent accéder à tous les comptes via RolesGuard
 *
 * ============================================================
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from './dto/common/guards/roles.guard';
import type { JwtUser } from './types/users.types';
import { Roles } from './dto/common/decorators/roles.decorator';

/**
 * @ApiTags('Users')
 * Regroupe tous les endpoints de ce contrôleur sous la
 * section "Users" dans la documentation Swagger (/api/docs).
 *
 * @Controller('users')
 * Préfixe toutes les routes de ce contrôleur avec /users.
 *
 * @UseGuards(JwtAuthGuard)
 * Applique JwtAuthGuard à TOUTES les routes du contrôleur.
 * Chaque requête doit contenir un token JWT valide dans
 * le header Authorization: Bearer <token>.
 *
 * @ApiBearerAuth('access-token')
 * Documente l'authentification JWT dans Swagger pour
 * toutes les routes de ce contrôleur.
 */
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  /**
   * UsersService est injecté automatiquement par NestJS
   * via le constructeur (injection de dépendances).
   * Le mot-clé private readonly garantit que le service
   * ne peut pas être réassigné après l'initialisation.
   */
  constructor(private readonly usersService: UsersService) {}

  // ══════════════════════════════════════════════════════════
  // 📌 GET /users — Lister tous les utilisateurs
  // ══════════════════════════════════════════════════════════

  /**
   * findAll()
   *
   * Retourne la liste complète de tous les utilisateurs
   * enregistrés dans l'application.
   *
   * 💡 Cette route est réservée aux administrateurs —
   *    RolesGuard vérifie que l'utilisateur connecté
   *    possède le rôle 'admin' avant d'autoriser l'accès.
   *
   * @UseGuards(RolesGuard) → vérifie le rôle après JWT
   * @Roles('admin')        → restreint l'accès aux admins
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lister tous les utilisateurs — admin uniquement' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  @ApiResponse({ status: 403, description: 'Accès refusé — admin uniquement' })
  findAll() {
    return this.usersService.findAll();
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /users/me — Profil de l'utilisateur connecté
  // ══════════════════════════════════════════════════════════

  /**
   * getMe()
   *
   * Retourne le profil complet de l'utilisateur actuellement
   * connecté, identifié via son token JWT.
   *
   * 💡 On utilise @CurrentUser() pour extraire l'utilisateur
   *    directement du token JWT sans avoir à passer l'id
   *    dans l'URL — plus sécurisé car l'id vient du token
   *    signé et non de la requête client.
   *
   * ⚠️ Cette route doit être déclarée AVANT GET /users/:id
   *    pour éviter que NestJS interprète "me" comme un :id.
   *
   * @param user → utilisateur connecté extrait du token JWT
   * @returns    → profil complet de l'utilisateur (SafeUser)
   */
  @Get('me')
  @ApiOperation({ summary: "Récupérer le profil de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  getMe(@CurrentUser() user: JwtUser) {
    return this.usersService.findOne(user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 GET /users/:id — Récupérer un utilisateur par id
  // ══════════════════════════════════════════════════════════

  /**
   * findOne()
   *
   * Retourne le profil d'un utilisateur identifié par son id.
   *
   * 💡 Cette route est réservée aux administrateurs —
   *    un utilisateur standard ne peut pas consulter
   *    le profil d'un autre utilisateur via cet endpoint.
   *    Il doit utiliser GET /users/me pour son propre profil.
   *
   * @param id → identifiant unique de l'utilisateur (UUID)
   * @returns  → profil de l'utilisateur (SafeUser)
   * @throws NotFoundException si l'utilisateur est introuvable
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Récupérer un utilisateur par son id — admin uniquement',
  })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 PATCH /users/:id — Mettre à jour son profil
  // ══════════════════════════════════════════════════════════

  /**
   * update()
   *
   * Met à jour le profil d'un utilisateur identifié par son id.
   *
   * 💡 On passe à la fois l'id de la cible (depuis l'URL)
   *    et l'id de l'utilisateur connecté (depuis le token JWT)
   *    au service — UsersService.update() vérifie que les deux
   *    correspondent pour empêcher la modification d'un autre profil.
   *
   * ⚠️ Restriction métier :
   *    Un utilisateur ne peut modifier QUE son propre profil.
   *    Toute tentative de modifier le profil d'un autre
   *    utilisateur lèvera une ForbiddenException (403).
   *
   * @param id   → identifiant de l'utilisateur cible (depuis l'URL)
   * @param user → utilisateur connecté extrait du token JWT
   * @param dto  → données de mise à jour (UpdateUserDto)
   * @returns    → profil mis à jour (SafeUser)
   * @throws ForbiddenException si l'utilisateur tente de modifier un autre profil
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour son profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  @ApiResponse({
    status: 403,
    description: "Impossible de modifier le profil d'un autre utilisateur",
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, user.id, dto);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 DELETE /users/:id — Supprimer son compte
  // ══════════════════════════════════════════════════════════

  /**
   * remove()
   *
   * Supprime définitivement le compte d'un utilisateur.
   *
   * 💡 Même logique de sécurité que update() — on passe
   *    les deux ids au service pour vérifier que l'utilisateur
   *    ne supprime que son propre compte.
   *
   * ⚠️ Cette opération est irréversible — le compte et
   *    toutes ses données associées sont supprimés définitivement
   *    de la base de données.
   *
   * @param id   → identifiant de l'utilisateur cible (depuis l'URL)
   * @param user → utilisateur connecté extrait du token JWT
   * @returns    → message de confirmation (MessageResponse)
   * @throws ForbiddenException si l'utilisateur tente de supprimer un autre compte
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer son compte utilisateur' })
  @ApiResponse({ status: 200, description: 'Compte supprimé' })
  @ApiResponse({
    status: 403,
    description: "Impossible de supprimer le compte d'un autre utilisateur",
  })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.usersService.remove(id, user.id);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 POST /users/:id/roles — Attribuer un rôle
  // ══════════════════════════════════════════════════════════

  /**
   * assignRole()
   *
   * Attribue un rôle à un utilisateur identifié par son id.
   *
   * 💡 Cette route est réservée aux administrateurs.
   *    Si le rôle est déjà attribué à l'utilisateur,
   *    l'opération est ignorée silencieusement (idempotent).
   *
   * @param id  → identifiant de l'utilisateur cible (depuis l'URL)
   * @param dto → nom du rôle à attribuer (AssignRoleDto)
   * @returns   → message de confirmation (MessageResponse)
   * @throws NotFoundException si le rôle est introuvable
   */
  @Post(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Attribuer un rôle à un utilisateur — admin uniquement',
  })
  @ApiResponse({ status: 200, description: 'Rôle attribué' })
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto.roleName);
  }

  // ══════════════════════════════════════════════════════════
  // 📌 DELETE /users/:id/roles — Retirer un rôle
  // ══════════════════════════════════════════════════════════

  /**
   * removeRole()
   *
   * Retire un rôle d'un utilisateur identifié par son id.
   *
   * 💡 Cette route est réservée aux administrateurs.
   *    Une NotFoundException sera levée si le rôle spécifié
   *    n'existe pas en base de données.
   *
   * @param id  → identifiant de l'utilisateur cible (depuis l'URL)
   * @param dto → nom du rôle à retirer (AssignRoleDto)
   * @returns   → message de confirmation (MessageResponse)
   * @throws NotFoundException si le rôle est introuvable
   */
  @Delete(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retirer un rôle d'un utilisateur — admin uniquement",
  })
  @ApiResponse({ status: 200, description: 'Rôle retiré' })
  removeRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.removeRole(id, dto.roleName);
  }
}
