/**
 * ============================================================
 * TESTS E2E — Auth Flow Complet
 * ============================================================
 *
 * Teste le flux d'authentification complet de bout en bout :
 * requête HTTP → controller → service → base de données → réponse.
 *
 * 💡 Rappel Module 12 (08:28:19 E2E Testing)
 *    supertest → simule de vraies requêtes HTTP sur l'app NestJS
 *    request(app.getHttpServer()) → récupère le serveur HTTP
 *    .post('/auth/signup') → envoie une requête POST
 *    .expect(201) → vérifie le status code
 *    .expect(res => { ... }) → vérifie le corps de la réponse
 *
 * 🔄 Flow testé :
 *    1. Signup → compte PENDING + OTP envoyé
 *    2. Verify OTP → compte ACTIVE
 *    3. Login → tokens JWT
 *    4. GET /auth/me → profil avec Bearer token
 *    5. Refresh token → nouveaux tokens
 *    6. Forgot password → OTP envoyé
 *    7. Reset password → nouveau mot de passe
 * ============================================================
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp, cleanDatabase } from './helpers/app.helper';
import { PrismaService } from '../src/prisma/prisma.service';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

describe('Auth — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Données partagées entre les tests
  let accessToken: string;
  let refreshToken: string;
  let userOtp: string;

  const testUser = {
    email: `test-${Date.now()}@e2e.com`,
    password: 'SecurePass123!',
    firstName: 'E2E',
    lastName: 'Test',
  };

  // ── Setup ─────────────────────────────────────────────

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ── POST /auth/signup ──────────────────────────────────

  describe('POST /auth/signup', () => {
    it('should create a new user and return success message', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('key', 'auth.signup_success');
      expect(response.body.success).toBe(true);

      // Récupère l'OTP depuis la DB pour les tests suivants
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      userOtp = user?.otpCode ?? '';
      expect(userOtp).toMatch(/^\d{6}$/);
    });

    it('should return 409 if email already exists', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(409);
    });

    it('should return 400 if email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);
    });

    it('should return 400 if password is too short', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...testUser, email: 'new@test.com', password: '123' })
        .expect(400);
    });
  });

  // ── POST /auth/verify-otp ──────────────────────────────

  describe('POST /auth/verify-otp', () => {
    it('should activate account with valid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ email: testUser.email, otp: userOtp })
        .expect(200);

      expect(response.body.data).toHaveProperty('key', 'auth.otp_verified');

      // Vérifie que le compte est maintenant ACTIVE en DB
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user?.status).toBe('ACTIVE');
      expect(user?.emailVerified).toBe(true);
    });

    it('should return 401 with invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ email: testUser.email, otp: '000000' })
        .expect(401);
    });
  });

  // ── POST /auth/login ───────────────────────────────────

  describe('POST /auth/login', () => {
    it('should login and return JWT tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('key', 'auth.login_success');

      // Sauvegarde les tokens pour les tests suivants
      accessToken = response.body.data.accessToken as string;
      refreshToken = response.body.data.refreshToken as string;
    });

    it('should return 401 with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongPass123!' })
        .expect(401);
    });

    it('should return 401 with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'unknown@test.com', password: 'SecurePass123!' })
        .expect(401);
    });
  });

  // ── GET /auth/me ───────────────────────────────────────

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('email', testUser.email);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // ── POST /auth/refresh ─────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Met à jour les tokens pour les tests suivants
      accessToken = response.body.data.accessToken as string;
      refreshToken = response.body.data.refreshToken as string;
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should return 401 if refresh token already used (rotation)', async () => {
      // Le refreshToken précédent a été révoqué lors du refresh
      const oldRefreshToken = refreshToken;

      // D'abord on refresh une fois
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      // Met à jour pour les prochains tests
      accessToken = response.body.data.accessToken as string;
      refreshToken = response.body.data.refreshToken as string;

      // Le même token ne peut pas être utilisé deux fois
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  // ── POST /auth/forgot-password ─────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('should return success even if email does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.data).toHaveProperty(
        'key',
        'auth.password_reset_sent',
      );
    });

    it('should send OTP if email exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.data).toHaveProperty(
        'key',
        'auth.password_reset_sent',
      );

      // Vérifie qu'un OTP a été généré en DB
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user?.otpCode).toBeTruthy();
      userOtp = user?.otpCode ?? '';
    });
  });

  // ── POST /auth/reset-password ──────────────────────────

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testUser.email,
          otp: userOtp,
          newPassword: 'NewSecurePass123!',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty(
        'key',
        'auth.password_reset_success',
      );

      // Vérifie qu'on peut se connecter avec le nouveau mot de passe
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'NewSecurePass123!' })
        .expect(200);
    });

    it('should return 401 with invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testUser.email,
          otp: '000000',
          newPassword: 'NewPass123!',
        })
        .expect(401);
    });
  });
});
