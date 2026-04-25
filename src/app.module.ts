/**
 * ============================================================
 * MODULE — AppModule (Racine de l'application)
 * ============================================================
 *
 * Point d'entrée du graphe de modules NestJS.
 * Tous les modules fonctionnels sont déclarés ici et composés
 * pour former l'application complète.
 *
 * 📋 Modules importés :
 *    - ConfigModule  → variables d'environnement globales (.env)
 *    - I18nModule    → messages de réponse traduits
 *    - PrismaModule  → accès à la base de données (PostgreSQL)
 *    - AuthModule    → authentification (JWT, OAuth, OTP...)
 *    - MailModule    → envoi des emails transactionnels
 *
 * 💡 ConfigModule.forRoot({ isGlobal: true }) :
 *    Rend les variables d'environnement accessibles dans tous
 *    les modules sans avoir à importer ConfigModule partout.
 *    Un seul import ici suffit pour toute l'application.
 *
 * 💡 Ce module ne déclare aucun provider métier :
 *    AppModule est un module d'orchestration pure. La logique
 *    est encapsulée dans chaque module fonctionnel.
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from './i18n/i18n.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
@Module({
  imports: [
    /**
     * ConfigModule — Variables d'environnement
     *
     * isGlobal: true  → disponible dans tous les modules sans réimport
     * envFilePath: '.env' → fichier de config chargé à l'initialisation
     *
     * 💡 Doit être déclaré en premier pour que les autres modules
     *    puissent accéder aux variables d'environnement dès leur
     *    propre initialisation.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    OrganizationsModule, // gestion des organisations (CRUD, membres, rôles)
    I18nModule, // messages traduits (clés i18n → réponses HTTP)
    PrismaModule, // singleton PrismaService partagé entre les modules
    AuthModule, // inscription, connexion, JWT, OAuth, OTP
    MailModule, // emails transactionnels via événements @OnEvent()
    UsersModule, // gestion des utilisateurs (CRUD, rôles, permissions)
  ],
  controllers: [AppController], // controller racine (healthcheck, route par défaut)
})
export class AppModule {}
