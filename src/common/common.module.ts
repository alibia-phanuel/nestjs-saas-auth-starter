/**
 * ============================================================
 * MODULE — CommonModule
 * ============================================================
 *
 * Module partagé qui exporte les services utilitaires
 * utilisés dans toute l'application.
 *
 * 💡 Rappel Module 1 (00:18:09 Creating Module)
 *    @Global() → le module est disponible partout sans import.
 *    exports: [...] → ce que les autres modules peuvent utiliser.
 *
 * Ce module exporte :
 *    AppLoggerService → pour logger dans n'importe quel service
 * ============================================================
 */

import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './logger/logger.service';

@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class CommonModule {}
