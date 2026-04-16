import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Validation globale ───────────────────────
  // Rappel Module 2 (00:48:10) — class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // erreur si champ inconnu envoyé
      transform: true, // transforme les types automatiquement
    }),
  );

  // ─── CORS ─────────────────────────────────────
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  // ─── Swagger ──────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('nestjs-saas-starter')
    .setDescription(
      `
## Enterprise-grade SaaS Starter Kit

API REST complète pour accélérer vos projets SaaS.

### Features
- 🔐 **Auth** — JWT, Refresh Token, 2FA, OAuth, API Key
- 👥 **Users** — CRUD, RBAC, Email activation
- 🏢 **SaaS** — Multi-tenancy, Plans, Invitations
- 🌍 **i18n** — Message Keys pour frontends multilingues
- 🧪 **TDD** — Couverture de tests > 80%

### Authentication
Utilisez le bouton **Authorize** pour tester les endpoints protégés.
- **Bearer Token** : \`Authorization: Bearer <access_token>\`
- **API Key** : \`x-api-key: <api_key>\`
      `,
    )
    .setVersion('1.0.0')
    .setContact(
      'Tsopze Phanuel Arsene',
      'https://phanuel-alibia.com/',
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
      'access-token', // ← nom de référence pour @ApiBearerAuth()
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Enter your API Key',
      },
      'api-key', // ← nom de référence pour @ApiSecurity()
    )
    .addTag('Auth', 'Signup, Login, Logout, Token refresh')
    .addTag('Users', 'User management and profiles')
    .addTag('Organizations', 'Multi-tenancy management')
    .addTag('Plans', 'SaaS subscription plans')
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
      persistAuthorization: true, // garde le token entre les refreshs
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 nestjs-saas-starter is running !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  App        → http://localhost:${port}
  Swagger    → http://localhost:${port}/api/docs
  Health     → http://localhost:${port}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

bootstrap();
