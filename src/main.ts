import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Validation globale ───────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
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
## Kit de démarrage SaaS Enterprise

API REST complète pour accélérer vos projets SaaS.

### Fonctionnalités
- 🔐 **Auth** — JWT, Refresh Token, 2FA, OAuth, API Key
- 👥 **Users** — CRUD, RBAC, Activation par email
- 🏢 **SaaS** — Multi-tenant, Plans, Invitations
- 🌍 **i18n** — Clés de messages pour frontends multilingues
- 🧪 **TDD** — Couverture de tests > 80%

### Authentification
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
    .addServer('http://localhost:3000', 'Développement')
    .addServer('https://nestjs-saas-auth-starter.onrender.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Entrez votre access token JWT',
      },
      'access-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Entrez votre clé API',
      },
      'api-key',
    )
    .addTag(
      'Auth',
      'Inscription, Connexion, Déconnexion, Rafraîchissement du token',
    )
    .addTag('Users', 'Gestion des utilisateurs et profils')
    .addTag('Organizations', 'Gestion multi-tenant')
    .addTag('Plans', "Plans d'abonnement SaaS")
    .addTag('Health', "Vérification de l'état du serveur")
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
