/**
 * ============================================================
 * SERVICE — UsersService (Logique métier des utilisateurs)
 * ============================================================
 *
 * Ce service contient toute la logique métier liée aux utilisateurs :
 * récupération, mise à jour, suppression et gestion des rôles.
 *
 * 💡 C'est quoi un service dans NestJS ?
 *    Un service est responsable de la logique métier.
 *    Il manipule les données, applique les नियम (règles),
 *    et interagit avec la base de données.
 *
 *    👉 En clair :
 *       - Controller → reçoit la requête HTTP
 *       - Service    → décide quoi faire (logique métier)
 *
 * ⚙️ Responsabilités principales :
 *    ─────────────────────────────────────────────────────
 *    - Accès aux données via Prisma (ORM)
 *    - Application des règles métier (sécurité, restrictions)
 *    - Gestion des erreurs (NotFound, Forbidden)
 *    - Traduction des messages via I18n
 *    ─────────────────────────────────────────────────────
 *
 * 🔐 Sécurité métier :
 *    ─────────────────────────────────────────────────────
 *    - Un utilisateur ne peut modifier/supprimer QUE son propre compte
 *    - Vérification faite ici (et non dans le controller)
 *    - Les rôles (admin) sont gérés au niveau des guards
 *    ─────────────────────────────────────────────────────
 *
 * 🌍 Internationalisation :
 *    ─────────────────────────────────────────────────────
 *    - Tous les messages passent par I18nService
 *    - Permet d’adapter les réponses selon la langue
 *    ─────────────────────────────────────────────────────
 *
 * ============================================================
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { MessageResponse, SafeUser } from './types/users.types';

// ─────────────────────────────────────────────────────
@Injectable()
export class UsersService {
  /**
   * Injection des dépendances :
   *
   * - PrismaService → accès à la base de données
   * - I18nService   → génération de messages traduits
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // ══════════════════════════════════════════════════════════
  // 📌 FIND ALL — Récupérer tous les utilisateurs
  // ══════════════════════════════════════════════════════════

  /**
   * findAll()
   *
   * Retourne la liste complète des utilisateurs.
   *
   * 💡 Utilisé principalement par les admins
   *    (restriction appliquée côté controller).
   *
   * ⚙️ Détails techniques :
   *    - Utilise Prisma pour interroger la base
   *    - Retourne uniquement les champs "safe"
   *      (aucune donnée sensible comme password)
   *    - Inclut les rôles et permissions
   *    - Trie par date de création (plus récent en premier)
   *
   * @returns SafeUser[] → liste des utilisateurs
   */
  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        roles: {
          include: {
            role: {
              select: {
                name: true,
                permissions: { select: { action: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ══════════════════════════════════════════════════════════
  // 📌 FIND ONE — Récupérer un utilisateur
  // ══════════════════════════════════════════════════════════

  /**
   * findOne()
   *
   * Retourne un utilisateur à partir de son id.
   *
   * ⚠️ Si l'utilisateur n'existe pas → NotFoundException
   *
   * 💡 Utilisé par :
   *    - GET /users/me
   *    - GET /users/:id (admin)
   *
   * @param userId → identifiant de l'utilisateur
   * @returns SafeUser → utilisateur trouvé
   */
  async findOne(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        roles: {
          include: {
            role: {
              select: {
                name: true,
                permissions: { select: { action: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.createResponse('users.not_found'));
    }

    return user;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 UPDATE — Modifier un utilisateur
  // ══════════════════════════════════════════════════════════

  /**
   * update()
   *
   * Met à jour les informations d’un utilisateur.
   *
   * 🔐 Règle métier critique :
   *    - Un utilisateur ne peut modifier QUE son propre profil
   *    - Comparaison entre :
   *        targetUserId     (URL)
   *        requestingUserId (JWT)
   *
   * ⚠️ Si différent → ForbiddenException (403)
   *
   * ⚠️ Si utilisateur inexistant → NotFoundException (404)
   *
   * @param targetUserId      → utilisateur à modifier
   * @param requestingUserId  → utilisateur connecté
   * @param dto               → données à mettre à jour
   * @returns SafeUser        → utilisateur mis à jour
   */
  async update(
    targetUserId: string,
    requestingUserId: string,
    dto: UpdateUserDto,
  ): Promise<SafeUser> {
    if (targetUserId !== requestingUserId) {
      throw new ForbiddenException(this.i18n.createResponse('users.forbidden'));
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.createResponse('users.not_found'));
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // 📌 REMOVE — Supprimer un utilisateur
  // ══════════════════════════════════════════════════════════

  /**
   * remove()
   *
   * Supprime définitivement un utilisateur.
   *
   * 🔐 Même règle que update() :
   *    - suppression uniquement de son propre compte
   *
   * ⚠️ Opération irréversible
   *
   * @param targetUserId     → utilisateur à supprimer
   * @param requestingUserId → utilisateur connecté
   * @returns MessageResponse → message de confirmation
   */
  async remove(
    targetUserId: string,
    requestingUserId: string,
  ): Promise<MessageResponse> {
    if (targetUserId !== requestingUserId) {
      throw new ForbiddenException(this.i18n.createResponse('users.forbidden'));
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.createResponse('users.not_found'));
    }

    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    return this.i18n.createResponse('users.deleted');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 ASSIGN ROLE — Attribuer un rôle
  // ══════════════════════════════════════════════════════════

  /**
   * assignRole()
   *
   * Attribue un rôle à un utilisateur.
   *
   * 💡 Fonctionne avec un système RBAC (Role-Based Access Control)
   *
   * ⚙️ Étapes :
   *    1. Vérifie que l'utilisateur existe
   *    2. Vérifie que le rôle existe
   *    3. Vérifie que le rôle n'est pas déjà attribué
   *    4. Crée la relation user ↔ role
   *
   * 💡 Idempotent :
   *    - Si le rôle existe déjà → aucune erreur
   *
   * @param userId   → utilisateur cible
   * @param roleName → rôle à attribuer
   * @returns MessageResponse
   */
  async assignRole(userId: string, roleName: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.createResponse('users.not_found'));
    }

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const existing = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId: role.id },
      },
    });

    if (!existing) {
      await this.prisma.userRole.create({
        data: { userId, roleId: role.id },
      });
    }

    return this.i18n.createResponse('users.updated');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 REMOVE ROLE — Retirer un rôle
  // ══════════════════════════════════════════════════════════

  /**
   * removeRole()
   *
   * Retire un rôle d'un utilisateur.
   *
   * ⚠️ Si le rôle n'existe pas → NotFoundException
   *
   * 💡 Supprime la relation user ↔ role
   *
   * @param userId   → utilisateur cible
   * @param roleName → rôle à retirer
   * @returns MessageResponse
   */
  async removeRole(userId: string, roleName: string): Promise<MessageResponse> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId: role.id },
      },
    });

    return this.i18n.createResponse('users.updated');
  }
}
