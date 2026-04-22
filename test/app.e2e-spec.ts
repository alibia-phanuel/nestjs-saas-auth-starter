/**
 * ============================================================
 * TEST E2E — AppController
 * ============================================================
 *
 * Ce fichier contient les tests de bout en bout (end-to-end)
 * du controller racine de l'application.
 *
 * 💡 Différence test unitaire vs e2e :
 *    Contrairement aux tests unitaires qui isolent un service,
 *    les tests e2e chargent l'intégralité de AppModule et
 *    envoient de vraies requêtes HTTP via Supertest.
 *    → On teste le comportement réel de l'application,
 *      middlewares et pipes inclus.
 *
 * 🔧 Outils utilisés :
 *    - @nestjs/testing → création du module NestJS de test
 *    - supertest       → simulation de requêtes HTTP sans serveur
 *
 * 📋 Cas couverts :
 *    ─────────────────────────────────────────────────────
 *    Cas 1 — GET / : répond 200 avec le corps attendu
 *    ─────────────────────────────────────────────────────
 *
 * ⚠️  Ces tests nécessitent une base de données et un fichier
 *    .env valides car AppModule est chargé en entier.
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  /**
   * Instancie l'application NestJS complète avant chaque test.
   *
   * 💡 AppModule est importé en entier (pas de mock) :
   *    tous les modules, guards, pipes et middlewares sont actifs.
   *    C'est ce qui distingue ce test des tests unitaires.
   *
   * 💡 app.init() démarre le cycle de vie NestJS (onModuleInit,
   *    onApplicationBootstrap...) sans ouvrir de port réseau.
   *    Supertest se connecte directement au handler HTTP interne.
   */
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // ── Cas 1 : GET / → 200 ──────────────────────────────────
  /**
   * Vérifie que la route racine répond correctement.
   * Ce test sert de smoke test : si AppModule ne démarre pas
   * (config manquante, erreur Prisma...), il échoue ici en premier.
   */
  it('GET / — devrait répondre 200 avec le corps attendu', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200) // code HTTP attendu
      .expect('Hello World!'); // corps de réponse attendu
  });
});
