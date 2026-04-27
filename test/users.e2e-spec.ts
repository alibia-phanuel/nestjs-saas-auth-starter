/**
 * ============================================================
 * TESTS E2E — Users Flow
 * ============================================================
 *
 * Teste les endpoints de gestion des utilisateurs.
 *
 * 💡 Rappel Module 12 (08:28:19 E2E Testing)
 *    On réutilise createTestApp() et cleanDatabase() du helper.
 *    Chaque describe bloc teste un endpoint différent.
 * ============================================================
 */

import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp, cleanDatabase } from './helpers/app.helper';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: `users-e2e-${Date.now()}@test.com`,
    password: 'SecurePass123!',
    firstName: 'Users',
    lastName: 'E2E',
  };

  // ── Setup ─────────────────────────────────────────────

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    // Crée et active un utilisateur de test
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);

    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    userId = user?.id ?? '';

    // Active le compte manuellement pour les tests
    await prisma.user.update({
      where: { email: testUser.email },
      data: { status: 'ACTIVE', emailVerified: true, otpCode: null },
    });

    // Login pour obtenir le token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    accessToken = loginResponse.body.data.accessToken as string;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ── GET /users/me ──────────────────────────────────────

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty(
        'firstName',
        testUser.firstName,
      );
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  // ── PATCH /users/:id ───────────────────────────────────

  describe('PATCH /users/:id', () => {
    it('should update user profile', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(response.body.data).toHaveProperty('firstName', 'Updated');
    });

    it('should return 403 if updating another user', async () => {
      await request(app.getHttpServer())
        .patch('/users/other-user-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });
  });

  // ── GET /users ─────────────────────────────────────────

  describe('GET /users', () => {
    it('should return 403 for non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });
});
