/**
 * ============================================================
 * MODULE — UsersModule (Gestion des utilisateurs)
 * ============================================================
 *
 * Ce module regroupe tous les éléments liés à la gestion
 * des utilisateurs dans l'application : contrôleur, service
 * et dépendances nécessaires.
 *
 * 💡 C'est quoi un module dans NestJS ?
 *    Un module est une unité d'organisation qui encapsule
 *    une fonctionnalité métier. Il permet de regrouper
 *    les controllers, services et dépendances associées.
 *
 *    👉 En clair :
 *       - Controller → expose les endpoints HTTP
 *       - Service    → contient la logique métier
 *       - Module     → assemble tout ça proprement
 *
 * 📦 Contenu du module :
 *    ─────────────────────────────────────────────────────
 *    - UsersController → gère les requêtes HTTP (/users)
 *    - UsersService    → logique métier des utilisateurs
 *    ─────────────────────────────────────────────────────
 *
 * 🔗 Dépendances importées :
 *    ─────────────────────────────────────────────────────
 *    - PrismaModule → accès à la base de données (ORM)
 *    - I18nModule   → gestion des traductions (messages, erreurs)
 *    ─────────────────────────────────────────────────────
 *
 * 🔄 Export :
 *    ─────────────────────────────────────────────────────
 *    - UsersService → permet à d'autres modules d'utiliser
 *                     la logique des utilisateurs
 *    ─────────────────────────────────────────────────────
 *
 * 💡 Cas d'utilisation de l'export :
 *    - AuthModule → pour récupérer un utilisateur lors du login
 *    - OrdersModule / ColisModule → pour lier un utilisateur à une entité
 *
 * ⚠️ Bonnes pratiques respectées :
 *    - Le module ne contient PAS de logique métier
 *    - Il sert uniquement à organiser et injecter les dépendances
 *    - Les services sont réutilisables via exports
 *
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { I18nModule } from '../i18n/i18n.module';

/**
 * @Module()
 *
 * Décorateur principal qui permet à NestJS de comprendre
 * comment assembler ce module.
 *
 * 📌 imports
 *    → modules dont UsersModule dépend
 *
 * 📌 controllers
 *    → endpoints exposés par ce module
 *
 * 📌 providers
 *    → services injectables (logique métier)
 *
 * 📌 exports
 *    → éléments rendus accessibles aux autres modules
 */
@Module({
  /**
   * Modules externes nécessaires au fonctionnement
   * de UsersModule.
   */
  imports: [
    PrismaModule, // Accès à la base de données via Prisma
    I18nModule, // Gestion des traductions (i18n)
  ],

  /**
   * Contrôleurs qui exposent les routes HTTP
   * liées aux utilisateurs.
   */
  controllers: [UsersController],

  /**
   * Services contenant la logique métier
   * des utilisateurs.
   */
  providers: [UsersService],

  /**
   * Services exportés pour être utilisés
   * dans d'autres modules.
   */
  exports: [UsersService],
})
export class UsersModule {}
