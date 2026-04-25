/**
 * ============================================================
 * SERVICE — OrganizationsService
 * ============================================================
 *
 * Service principal chargé de toute la logique métier liée aux organisations.
 *
 * Responsabilités :
 *   - Création et gestion des organisations
 *   - Gestion des membres (ajout, suppression, vérification des rôles)
 *   - Gestion des invitations (création, validation, expiration)
 *   - Vérification des droits d'accès (Owner / Admin)
 *
 * 💡 Règles métier importantes :
 *    - Seul le propriétaire (OWNER) peut supprimer une organisation
 *    - Seuls les OWNER et ADMIN peuvent modifier l’organisation ou gérer les membres
 *    - Tout utilisateur ne peut voir que les organisations dont il est membre
 *    - Les invitations expirent après 7 jours et sont sécurisées par token
 *
 * ============================================================
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { MemberRole } from '../generated/prisma';
import { MessageResponse } from './types/organizations.types';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ══════════════════════════════════════════════════════════
  // 📌 CREATE — Créer une nouvelle organisation
  // ══════════════════════════════════════════════════════════

  /**
   * Crée une nouvelle organisation et ajoute automatiquement le créateur
   * comme propriétaire (OWNER).
   *
   * @param userId - ID de l'utilisateur qui crée l'organisation
   * @param dto    - Données de création (nom, slug, planType, etc.)
   * @returns L'organisation créée avec ses membres
   * @throws ConflictException si le slug est déjà utilisé
   */
  async create(userId: string, dto: CreateOrganizationDto) {
    // Vérifie si le slug est déjà pris
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        this.i18n.createResponse('organizations.slug_taken'),
      );
    }

    // Crée l'organisation et ajoute le créateur comme OWNER
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        planType: dto.planType,
        members: {
          create: {
            userId,
            role: MemberRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    return org;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 FIND ALL BY USER — Lister les organisations d'un utilisateur
  // ══════════════════════════════════════════════════════════

  /**
   * Retourne toutes les organisations dont l'utilisateur est membre.
   *
   * @param userId - ID de l'utilisateur
   * @returns Liste des organisations avec informations de base
   */
  async findAllByUser(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            createdAt: true,
          },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // 📌 FIND ONE — Récupérer une organisation
  // ══════════════════════════════════════════════════════════

  /**
   * Récupère les détails complets d'une organisation.
   *
   * Vérifie que l'utilisateur est bien membre de l'organisation.
   *
   * @param orgId  - ID de l'organisation
   * @param userId - ID de l'utilisateur connecté
   * @returns L'organisation avec la liste de ses membres
   * @throws NotFoundException si l'organisation n'existe pas
   * @throws ForbiddenException si l'utilisateur n'est pas membre
   */
  async findOne(orgId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(
        this.i18n.createResponse('organizations.not_found'),
      );
    }

    // Vérifie que l'utilisateur est membre
    const isMember = org.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException(
        this.i18n.createResponse('organizations.forbidden'),
      );
    }

    return org;
  }

  // ══════════════════════════════════════════════════════════
  // 📌 UPDATE — Mettre à jour une organisation
  // ══════════════════════════════════════════════════════════

  /**
   * Met à jour les informations d'une organisation.
   *
   * Seuls les propriétaires et administrateurs peuvent effectuer cette action.
   *
   * @param orgId  - ID de l'organisation
   * @param userId - ID de l'utilisateur qui fait la modification
   * @param dto    - Données de mise à jour
   * @returns L'organisation mise à jour
   */
  async update(orgId: string, userId: string, dto: UpdateOrganizationDto) {
    await this.checkOwnerOrAdmin(orgId, userId);

    return this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 📌 REMOVE — Supprimer une organisation
  // ══════════════════════════════════════════════════════════

  /**
   * Supprime définitivement une organisation.
   *
   * Réservé uniquement au propriétaire.
   *
   * ⚠️ Cette opération est irréversible.
   *
   * @param orgId  - ID de l'organisation
   * @param userId - ID du propriétaire
   * @returns Message de confirmation
   */
  async remove(orgId: string, userId: string): Promise<MessageResponse> {
    await this.checkOwner(orgId, userId);

    await this.prisma.organization.delete({
      where: { id: orgId },
    });

    return this.i18n.createResponse('organizations.deleted');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 INVITE MEMBER — Inviter un membre
  // ══════════════════════════════════════════════════════════

  /**
   * Envoie une invitation à rejoindre une organisation.
   *
   * Seuls les OWNER et ADMIN peuvent inviter.
   * Un token sécurisé est généré et un événement est émis pour l'envoi d'email.
   *
   * @param orgId  - ID de l'organisation
   * @param userId - ID de l'utilisateur qui invite
   * @param dto    - Données de l'invitation (email, etc.)
   * @returns Message de confirmation
   */
  async inviteMember(
    orgId: string,
    userId: string,
    dto: InviteMemberDto,
  ): Promise<MessageResponse> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) {
      throw new NotFoundException(
        this.i18n.createResponse('organizations.not_found'),
      );
    }

    // Vérifie les droits de l'utilisateur
    const requester = org.members.find((m) => m.userId === userId);
    if (
      !requester ||
      (requester.role !== MemberRole.OWNER &&
        requester.role !== MemberRole.ADMIN)
    ) {
      throw new ForbiddenException(
        this.i18n.createResponse('organizations.forbidden'),
      );
    }

    // Génère un token d'invitation sécurisé (valable 7 jours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        token,
        organizationId: orgId,
        expiresAt,
      },
    });

    // Émet un événement pour envoyer l'email d'invitation
    this.eventEmitter.emit('organization.invitation', {
      email: dto.email,
      organizationName: org.name,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });

    return this.i18n.createResponse('organizations.invitation_sent');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 ACCEPT INVITATION — Accepter une invitation
  // ══════════════════════════════════════════════════════════

  /**
   * Accepte une invitation via un token.
   *
   * Vérifie la validité du token (existence, non expiré, non déjà utilisé).
   * Ajoute l'utilisateur comme MEMBER s'il n'est pas déjà membre.
   *
   * @param token  - Token d'invitation
   * @param userId - ID de l'utilisateur qui accepte
   * @returns Message de confirmation
   * @throws ForbiddenException si le token est invalide ou expiré
   */
  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<MessageResponse> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new ForbiddenException(
        this.i18n.createResponse('organizations.invitation_invalid'),
      );
    }

    if (invitation.acceptedAt) {
      throw new ForbiddenException(
        this.i18n.createResponse('organizations.invitation_invalid'),
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new ForbiddenException(
        this.i18n.createResponse('organizations.invitation_invalid'),
      );
    }

    // Ajoute l'utilisateur comme membre s'il ne l'est pas déjà
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (!existingMember) {
      await this.prisma.organizationMember.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: MemberRole.MEMBER,
        },
      });
    }

    // Marque l'invitation comme acceptée
    await this.prisma.invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    return this.i18n.createResponse('organizations.invitation_accepted');
  }

  // ══════════════════════════════════════════════════════════
  // 📌 REMOVE MEMBER — Retirer un membre
  // ══════════════════════════════════════════════════════════

  /**
   * Retire un membre d'une organisation.
   *
   * Seuls les OWNER et ADMIN peuvent retirer des membres.
   *
   * @param orgId        - ID de l'organisation
   * @param requesterId  - ID de l'utilisateur qui fait l'action
   * @param targetUserId - ID de l'utilisateur à retirer
   * @returns Message de confirmation
   */
  async removeMember(
    orgId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<MessageResponse> {
    await this.checkOwnerOrAdmin(orgId, requesterId);

    await this.prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId: orgId,
        },
      },
    });

    return this.i18n.createResponse('organizations.updated');
  }

  // ══════════════════════════════════════════════════════════
  // 🔧 HELPERS PRIVÉS
  // ══════════════════════════════════════════════════════════

  /**
   * Vérifie que l'utilisateur est le propriétaire (OWNER) de l'organisation.
   * @throws ForbiddenException sinon
   */
  private async checkOwner(orgId: string, userId: string): Promise<void> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    });

    if (!member || member.role !== MemberRole.OWNER) {
      throw new ForbiddenException(
        this.i18n.createResponse('organizations.forbidden'),
      );
    }
  }

  /**
   * Vérifie que l'utilisateur est soit propriétaire (OWNER) soit administrateur (ADMIN).
   * @throws ForbiddenException sinon
   */
  private async checkOwnerOrAdmin(
    orgId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    });

    if (
      !member ||
      (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)
    ) {
      throw new ForbiddenException(
        this.i18n.createResponse('organizations.forbidden'),
      );
    }
  }
}
