/**
 * ============================================================
 * MODULE — PrismaModule
 * ============================================================
 *
 * Déclare et expose le PrismaService à tous les modules
 * qui ont besoin d'accéder à la base de données.
 *
 * 💡 Pattern module dédié vs import direct :
 *    Encapsuler PrismaService dans son propre module permet
 *    de l'importer une seule fois par module consommateur
 *    via imports: [PrismaModule], sans redéclarer le provider
 *    dans chaque module. NestJS gère le singleton automatiquement.
 *
 * 💡 Ce module n'a aucune dépendance externe : il n'importe
 *    rien d'autre, ce qui le rend réutilisable partout dans
 *    l'application sans risque de dépendance circulaire.
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService], // instancié comme singleton par NestJS
  exports: [PrismaService], // accessible aux modules importateurs
})
export class PrismaModule {}
