/**
 * ============================================================
 * MODULE — OrganizationsModule
 * ============================================================
 *
 * Ce module regroupe toute la logique liée à la gestion des organisations :
 * contrôleur, service et dépendances nécessaires.
 *
 * 💡 C'est quoi un Module dans NestJS ?
 *    Un module est un conteneur qui organise le code de l'application
 *    en fonctionnalités cohérentes. Il déclare les contrôleurs, services,
 *    imports et exports pour permettre l'injection de dépendances.
 *
 * 📋 Contenu de ce module :
 *    ─────────────────────────────────────────────────────
 *    Controllers   → OrganizationsController
 *    Providers     → OrganizationsService
 *    Imports       → PrismaModule (accès à la base de données)
 *    Exports       → OrganizationsService (pour pouvoir l'utiliser
 *                    dans d'autres modules, ex: UsersModule ou AuthModule)
 *    ─────────────────────────────────────────────────────
 *
 * 🧩 Responsabilités :
 *    - Gestion complète des organisations (CRUD)
 *    - Gestion des membres et des invitations
 *    - Vérification des droits d'accès (propriétaire / administrateur)
 *
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * @Module
 *
 * Configuration du module Organizations :
 *
 * - imports   : Modules nécessaires pour fonctionner (ici Prisma pour la DB)
 * - controllers : Les contrôleurs exposés par ce module
 * - providers : Les services (et autres providers) déclarés dans ce module
 * - exports   : Ce qui est rendu disponible aux autres modules qui importent OrganizationsModule
 *
 * ⚠️ Important :
 *    OrganizationsService est exporté car il est utilisé dans d'autres modules
 *    (par exemple pour vérifier les droits d'accès ou gérer les relations utilisateur/organisation).
 */
@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
