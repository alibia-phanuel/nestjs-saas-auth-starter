/**
 * ============================================================
 * MODULE — MailModule
 * ============================================================
 *
 * Déclare et expose le MailService pour les autres modules
 * qui ont besoin d'envoyer des emails (ex: AuthModule).
 *
 * 💡 Ce module ne s'importe pas directement dans les contrôleurs.
 *    Il est importé dans les modules consommateurs via imports:[].
 *    Le MailService écoute les événements via @OnEvent() et
 *    n'a donc pas besoin d'être injecté manuellement.
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService], // instancié et géré par NestJS
  exports: [MailService], // accessible aux modules importateurs
})
export class MailModule {}
