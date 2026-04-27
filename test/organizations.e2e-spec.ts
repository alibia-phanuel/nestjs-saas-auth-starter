/**
 * ============================================================
 * TESTS E2E — Organizations Flow
 * ============================================================
 *
 * Teste le flux complet de gestion des organisations :
 * création → invitation → acceptation → suppression membre.
 *
 * 💡 Rappel Module 12 (08:28:19 E2E Testing)
 *    Les tests E2E sont ordonnés — chaque test dépend
 *    du résultat du précédent (orgId, token d'invitation...).
 *    On utilise des variables partagées entre les describes.
 * ============================================================
 */

import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp, cleanDatabase } from './helpers/app.helper';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Organizations — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let orgId: string;
  let invitationToken: string;

  const owner = {
    email: `owner-${Date.now()}@e2e.com`,
    password: 'SecurePass123!',
    firstName: 'Owner',
    lastName: 'E2E',
  };

  // ── Setup ─────────────────────────────────────────────

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    // Crée et active le owner
    await request(app.getHttpServer()).post('/auth/signup').send(owner);

    await prisma.user.update({
      where: { email: owner.email },
      data: { status: 'ACTIVE', emailVerified: true, otpCode: null },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: owner.email, password: owner.password });

    ownerToken = loginRes.body.data.accessToken as string;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ── POST /organizations ────────────────────────────────

  describe('POST /organizations', () => {
    it('should create organization and set creator as OWNER', async () => {
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'E2E Corp', slug: `e2e-corp-${Date.now()}` })
        .expect(201);

      expect(response.body.data).toHaveProperty('name', 'E2E Corp');
      expect(response.body.data).toHaveProperty('planType', 'FREE');

      orgId = response.body.data.id as string;
    });

    it('should return 409 if slug already taken', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Another Corp', slug: 'e2e-corp-taken' });

      await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Another Corp', slug: 'e2e-corp-taken' })
        .expect(409);
    });
  });

  // ── GET /organizations ─────────────────────────────────

  describe('GET /organizations', () => {
    it('should return organizations for current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  // ── GET /organizations/:id ─────────────────────────────

  describe('GET /organizations/:id', () => {
    it('should return organization details for member', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', orgId);
      expect(response.body.data).toHaveProperty('members');
    });
  });

  // ── POST /organizations/:id/invite ─────────────────────

  describe('POST /organizations/:id/invite', () => {
    it('should send invitation and create invitation record', async () => {
      const response = await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invite`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'invited@e2e.com' })
        .expect(200);

      expect(response.body.data).toHaveProperty(
        'key',
        'organizations.invitation_sent',
      );

      // Récupère le token d'invitation depuis la DB
      const invitation = await prisma.invitation.findFirst({
        where: { email: 'invited@e2e.com', organizationId: orgId },
      });

      expect(invitation).toBeTruthy();
      invitationToken = invitation?.token ?? '';
    });
  });

  // ── GET /organizations/accept/:token ───────────────────

  describe('GET /organizations/accept/:token', () => {
    it('should accept invitation and add user as member', async () => {
      // Crée et active un utilisateur invité
      const invited = {
        email: `invited-${Date.now()}@e2e.com`,
        password: 'SecurePass123!',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(invited);

      await prisma.user.update({
        where: { email: invited.email },
        data: { status: 'ACTIVE', emailVerified: true, otpCode: null },
      });

      // Met à jour l'invitation avec le bon email
      await prisma.invitation.update({
        where: { token: invitationToken },
        data: { email: invited.email },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: invited.email, password: invited.password });

      const invitedToken = loginRes.body.data.accessToken as string;

      const response = await request(app.getHttpServer())
        .get(`/organizations/accept/${invitationToken}`)
        .set('Authorization', `Bearer ${invitedToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty(
        'key',
        'organizations.invitation_accepted',
      );
    });

    it('should return 403 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/organizations/accept/invalid-token')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  // ── PATCH /organizations/:id ───────────────────────────

  describe('PATCH /organizations/:id', () => {
    it('should update organization as owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'E2E Corp Updated' })
        .expect(200);

      expect(response.body.data).toHaveProperty('name', 'E2E Corp Updated');
    });
  });

  // ── DELETE /organizations/:id ──────────────────────────

  describe('DELETE /organizations/:id', () => {
    it('should delete organization as owner', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('key', 'organizations.deleted');
    });
  });
});
