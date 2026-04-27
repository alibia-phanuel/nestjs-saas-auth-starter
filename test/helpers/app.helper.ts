/**
 * ============================================================
 * HELPER — AppHelper (Configuration E2E partagée)
 * ============================================================
 *
 * Crée une instance de l'application NestJS pour les tests E2E.
 * Réutilisable dans tous les fichiers de test E2E.
 *
 * 💡 Rappel Module 12 (08:28:19 E2E Testing)
 *    Test.createTestingModule() → crée un module de test complet
 *    app.init() → initialise l'app sans démarrer le serveur HTTP
 *    supertest(app.getHttpServer()) → simule des requêtes HTTP
 *
 * 💡 Différence avec les tests unitaires :
 *    - Tests unitaires → mock tout (PrismaService, etc.)
 *    - Tests E2E → utilise la vraie DB (PostgreSQL de test)
 *      On a besoin d'une DB de test séparée pour ne pas
 *      polluer les données de développement.
 * ============================================================
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { AppLoggerService } from '../../src/common/logger/logger.service';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * createTestApp()
 *
 * Crée et configure une instance NestJS pour les tests E2E.
 * Configure les mêmes pipes, filters et interceptors que main.ts
 * pour que les tests reflètent exactement le comportement en prod.
 *
 * @returns Promise<{ app, prisma }> — app NestJS + client Prisma
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const logger = app.get(AppLoggerService);

  // Même configuration que main.ts
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new ResponseInterceptor(),
  );

  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

/**
 * cleanDatabase()
 *
 * Nettoie la base de données de test entre les tests.
 * L'ordre est important — on supprime d'abord les tables
 * qui ont des clés étrangères vers d'autres tables.
 *
 * 💡 On utilise deleteMany() plutôt que truncate() car
 *    Prisma ne supporte pas truncate directement et
 *    deleteMany() respecte les contraintes de clés étrangères.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // Ordre important — clés étrangères d'abord
  await prisma.refreshToken.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
}
