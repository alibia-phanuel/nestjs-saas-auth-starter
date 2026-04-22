/**
 * ============================================================
 * TEST — PrismaService
 * ============================================================
 *
 * Ce fichier teste l'instanciation du PrismaService dans
 * le contexte du module de test NestJS.
 *
 * 💡 Pas de mock ici : PrismaService est testé tel quel,
 *    sans base de données réelle sollicitée à ce stade.
 *    Le test vérifie uniquement que NestJS peut instancier
 *    le service sans erreur (constructeur, décorateurs...).
 *
 * 📋 Cas couverts :
 *    ─────────────────────────────────────────────────────
 *    Cas 1 — Instanciation : le service est bien défini
 *    ─────────────────────────────────────────────────────
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  /**
   * Recrée un module de test NestJS minimal avant chaque test.
   * PrismaService est le seul provider déclaré : on teste
   * son instanciation isolée, sans dépendances externes.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  // ── Cas 1 : Instanciation ─────────────────────────────────
  /**
   * Vérifie que NestJS instancie PrismaService sans erreur.
   * Si ce test échoue, c'est généralement un problème dans
   * le constructeur ou dans un décorateur mal configuré.
   */
  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });
});
