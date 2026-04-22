/**
 * ============================================================
 * MODULE — AuthModule (Module d'authentification)
 * ============================================================
 *
 * Ce fichier assemble toutes les pièces du module d'authentification :
 * contrôleurs, services, stratégies et modules externes.
 *
 * 💡 C'est quoi un module dans NestJS ?
 *    Un module est un regroupement logique de fonctionnalités.
 *    Il déclare ce qu'il contient (providers, controllers) et
 *    ce qu'il partage avec le reste de l'application (exports).
 *    C'est le "chef d'orchestre" d'une fonctionnalité.
 *
 * 🗂️ Ce module regroupe tout ce qui concerne l'authentification :
 *    - Connexion classique (email + mot de passe)
 *    - Double authentification (2FA Google Authenticator)
 *    - OAuth Google
 *    - Clés API
 *    - Gestion des tokens JWT
 *
 * 📋 Structure du module :
 *    ─────────────────────────────────────────────────────
 *    imports      → modules externes dont on a besoin
 *    controllers  → exposent les endpoints HTTP
 *    providers    → services et stratégies disponibles
 *                   dans ce module (injection de dépendances)
 *    exports      → providers partagés avec d'autres modules
 *    ─────────────────────────────────────────────────────
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { TwoFactorService } from './two-factor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { I18nModule } from '../i18n/i18n.module';
import { ApiKeyService } from './api-key.service';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { ApiKeyController } from './api-key.controller';

@Module({
  /**
   * imports — Modules externes dont AuthModule a besoin
   *
   * 💡 On importe un module quand on veut utiliser les
   *    providers qu'il exporte dans notre propre module.
   */
  imports: [
    /**
     * PrismaModule
     * Fournit PrismaService pour l'accès à la base de données.
     * Utilisé par AuthService, ApiKeyService, JwtStrategy...
     */
    PrismaModule,

    /**
     * I18nModule
     * Fournit I18nService pour les messages traduits (FR/EN).
     * Utilisé par AuthService et ApiKeyService pour retourner
     * des réponses avec des clés de traduction.
     */
    I18nModule,

    /**
     * PassportModule
     * Intègre la bibliothèque Passport dans NestJS.
     * defaultStrategy: 'jwt' → si aucun guard ne précise
     * la stratégie, Passport utilise JWT par défaut.
     */
    PassportModule.register({ defaultStrategy: 'jwt' }),

    /**
     * JwtModule
     * Fournit JwtService pour signer et vérifier les tokens JWT.
     * register({}) → configuration vide car les secrets et durées
     * sont définis dynamiquement dans AuthService via process.env.
     */
    JwtModule.register({}),

    /**
     * EventEmitterModule
     * Fournit EventEmitter2 pour le système d'événements interne.
     * Utilisé pour déclencher des actions asynchrones comme
     * l'envoi d'emails (ex: emit('user.created', { email, otp })).
     * forRoot() → initialise le module au niveau global.
     */
    EventEmitterModule.forRoot(),
  ],

  /**
   * controllers — Contrôleurs qui exposent les endpoints HTTP
   *
   * NestJS enregistre automatiquement leurs routes au démarrage.
   */
  controllers: [
    AuthController, // POST /auth/signup, /auth/login, /auth/2fa/...
    ApiKeyController, // POST /auth/api-keys, GET /auth/api-keys/test...
  ],

  /**
   * providers — Services et stratégies disponibles dans ce module
   *
   * 💡 Un provider est une classe qui peut être injectée
   *    dans d'autres classes via le constructeur.
   *    NestJS gère automatiquement leur instanciation.
   */
  providers: [
    /**
     * AuthService
     * Service principal d'authentification :
     * signup, login, refreshToken, verifyOtp,
     * forgotPassword, resetPassword, 2FA...
     */
    AuthService,

    /**
     * OAuthService
     * Gère la connexion via Google OAuth :
     * création/liaison de compte, génération des tokens.
     */
    OAuthService,

    /**
     * ApiKeyService
     * Gère les clés API :
     * création, liste, révocation, validation.
     */
    ApiKeyService,

    /**
     * JwtStrategy
     * Stratégie Passport pour vérifier les tokens JWT.
     * Utilisée par JwtAuthGuard (Authorization: Bearer).
     */
    JwtStrategy,

    /**
     * GoogleStrategy
     * Stratégie Passport pour le flux OAuth Google.
     * Utilisée par GoogleAuthGuard (redirection Google).
     */
    GoogleStrategy,

    /**
     * ApiKeyStrategy
     * Stratégie Passport pour vérifier les clés API.
     * Utilisée par ApiKeyGuard (header x-api-key).
     */
    ApiKeyStrategy,

    /**
     * TwoFactorService
     * Gère la double authentification TOTP :
     * génération du secret, QR code, activation,
     * désactivation et vérification des codes.
     */
    TwoFactorService,
  ],

  /**
   * exports — Providers partagés avec d'autres modules
   *
   * 💡 Un provider exporté peut être injecté dans n'importe
   *    quel autre module qui importe AuthModule.
   *    Ex: si UserModule importe AuthModule, il peut injecter
   *    AuthService dans ses propres services.
   *
   * On exporte tout sauf les controllers (ils ne s'exportent pas)
   * et les modules externes (PrismaModule, JwtModule...) qui
   * gèrent eux-mêmes leur propre portée.
   */
  exports: [
    AuthService, // utilisable dans d'autres modules
    OAuthService, // utilisable dans d'autres modules
    JwtStrategy, // stratégie JWT partagée
    GoogleStrategy, // stratégie Google partagée
    TwoFactorService, // service 2FA partagé
    ApiKeyService, // service clés API partagé
    ApiKeyStrategy, // stratégie clés API partagée
  ],
})
export class AuthModule {}
