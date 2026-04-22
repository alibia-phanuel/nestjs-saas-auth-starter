/**
 * ============================================================
 * SERVICE — PrismaService (Client base de données)
 * ============================================================
 *
 * Ce service étend PrismaClient pour l'intégrer au système
 * d'injection de dépendances de NestJS via @Injectable().
 *
 * 💡 Pourquoi étendre PrismaClient plutôt que l'encapsuler ?
 *    En héritant directement, PrismaService expose toutes les
 *    méthodes Prisma (prisma.user, prisma.post...) sans wrapper.
 *    Les services consommateurs l'utilisent comme un PrismaClient
 *    natif tout en bénéficiant du cycle de vie NestJS.
 *
 * 🔧 Adaptateur utilisé :
 *    PrismaPg (@prisma/adapter-pg) → driver PostgreSQL natif.
 *    Requis pour utiliser Prisma en mode "driver adapters",
 *    plus performant que le mode TCP classique de Prisma.
 *
 * 🔧 Variable d'environnement attendue :
 *    - DATABASE_URL → chaîne de connexion PostgreSQL complète
 *      ex: postgresql://user:pass@host:5432/dbname
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    /**
     * Initialisation de l'adaptateur PostgreSQL natif.
     *
     * PrismaPg prend en charge la connexion à la base via
     * le driver pg (node-postgres) plutôt que via le moteur
     * Rust embarqué de Prisma (query engine binaire).
     *
     * 💡 DATABASE_URL est casté en string (as string) car
     *    process.env retourne string | undefined. Si la variable
     *    est absente, Prisma lancera une erreur explicite à
     *    l'initialisation plutôt qu'un crash silencieux plus tard.
     */
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });

    /**
     * On passe l'adaptateur à PrismaClient via super({ adapter }).
     * C'est le seul moyen de configurer Prisma en mode driver
     * adapters : la config ne peut pas être modifiée après super().
     *
     * 💡 Aucun user: any ici → le typage strict de PrismaClient
     *    est préservé, ce qui garantit l'autocomplétion et la
     *    détection d'erreurs à la compilation.
     */
    super({ adapter });
  }
}
