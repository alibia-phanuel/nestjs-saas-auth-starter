/**
 * ============================================================
 * BOOTSTRAP — main.ts (Point d'entrée de l'application)
 * ============================================================
 *
 * Configure et démarre l'application NestJS avec tous
 * les middlewares globaux, pipes, guards, filters et interceptors.
 *
 * 💡 Rappel Module 2 (00:32:39 Exception Filter)
 *    app.useGlobalFilters() → enregistre un filter global
 *    qui intercepte toutes les exceptions HTTP.
 *
 * 💡 Rappel Module 2 (00:48:10 Validate Request Body)
 *    app.useGlobalPipes() → applique la validation globale
 *    avec class-validator sur tous les DTOs.
 *
 * 💡 Rappel Module 9 (05:45:51 Swagger Setup)
 *    SwaggerModule.setup() → monte l'interface Swagger
 *    sur la route /api/docs.
 *
 * 🔧 Ordre d'enregistrement important :
 *    1. useGlobalFilters   → intercepte les erreurs
 *    2. useGlobalPipes     → valide les entrées
 *    3. useGlobalInterceptors → transforme les réponses
 *    4. SwaggerModule      → documentation
 *    5. app.listen()       → démarre le serveur
 * ============================================================
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    /**
     * bufferLogs: true → attend que le logger custom soit
     * initialisé avant de logger les messages de démarrage.
     * Évite les logs avec le logger par défaut au démarrage.
     */
    bufferLogs: true,
  });

  // ── Logger custom ─────────────────────────────────────
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // ── Exception Filter global ───────────────────────────
  // Rappel Module 2 (00:32:39) — formate toutes les erreurs HTTP
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // ── Validation globale ────────────────────────────────
  // Rappel Module 2 (00:48:10) — valide tous les DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les champs non déclarés
      forbidNonWhitelisted: true, // Erreur si champ inconnu
      transform: true, // Convertit les types automatiquement
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Interceptors globaux ──────────────────────────────
  // Ordre important : Logging d'abord, Response ensuite
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger), // Log toutes les requêtes
    new ResponseInterceptor(), // Formate toutes les réponses
  );

  // ── CORS ─────────────────────────────────────────────
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  // ── Swagger ───────────────────────────────────────────
  // Rappel Module 9 (05:45:51 Swagger Setup)
  const config = new DocumentBuilder()
    .setTitle('nestjs-saas-starter')
    .setDescription(
      `
## Enterprise-grade SaaS Starter Kit

API REST complète pour accélérer vos projets SaaS.

### Authentification
- **Bearer Token** : \`Authorization: Bearer <access_token>\`
- **API Key** : \`x-api-key: <api_key>\`

### Rate Limiting
- Endpoints généraux : 100 req/min
- Endpoints auth (login, signup) : 5 req/min
- Endpoints email (forgot-password) : 3 req/min
    `,
    )
    .setVersion('1.0.0')
    .setContact(
      'Tsopze Nekdem Phanuel Arsene',
      'https://phanuel-alibia.com',
      'phanuel.alibia@gmail.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .setExternalDoc(
      'GitHub Repository',
      'https://github.com/alibia-phanuel/nestjs-saas-auth-starter',
    )
    .addServer('http://localhost:3000', 'Development')
    .addServer('https://nestjs-saas-auth-starter.onrender.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'access-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Enter your API Key',
      },
      'api-key',
    )
    .addTag('Auth', 'Signup, Login, OTP, 2FA, OAuth, API Keys')
    .addTag('API Keys', 'Create and manage API keys')
    .addTag('Users', 'User management and RBAC')
    .addTag('Organizations', 'Multi-tenancy management')
    .addTag('Health', 'Application health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'nestjs-saas-starter — API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { background-color: #e0234e; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { color: #e0234e; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(
    `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 nestjs-saas-starter is running !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  App        → http://localhost:${port}
  Swagger    → http://localhost:${port}/api/docs
  GraphQL    → http://localhost:${port}/graphql
  Health     → http://localhost:${port}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `,
    'Bootstrap',
  );
}

bootstrap();
