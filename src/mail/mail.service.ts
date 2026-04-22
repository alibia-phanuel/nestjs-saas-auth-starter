/**
 * ============================================================
 * SERVICE — MailService (Envoi des emails transactionnels)
 * ============================================================
 *
 * Ce service est responsable de l'envoi de tous les emails
 * transactionnels de l'application via SMTP (Nodemailer).
 *
 * 💡 Architecture événementielle :
 *    Le MailService n'est jamais injecté directement.
 *    Il écoute les événements émis par d'autres services via
 *    @OnEvent() et réagit de manière découplée.
 *    → Aucun couplage fort entre AuthService et MailService.
 *
 * 🔧 Dépendances :
 *    - createTransporter() → instance SMTP Nodemailer (mail.transporter)
 *    - email.templates     → fonctions de génération du HTML
 *    - Logger (NestJS)     → logs de succès et d'échec d'envoi
 *
 * 📋 Méthodes exposées (via événements) :
 *    - handleUserCreated()      → écoute « user.created »
 *    - handlePasswordReset()    → écoute « password.reset »
 *    - handleOAuthUserCreated() → écoute « user.oauth.created »
 *
 * 🔒 Méthode privée :
 *    - sendMail() → wrapper SMTP avec gestion d'erreur centralisée
 *
 * 🔀 Emails envoyés par événement :
 *    ─────────────────────────────────────────────────────
 *    « user.created »       → welcome + OTP vérification (x2)
 *    « password.reset »     → OTP réinitialisation        (x1)
 *    « user.oauth.created » → welcome uniquement          (x1)
 *    ─────────────────────────────────────────────────────
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Transporter } from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer/lib/smtp-transport';
import { createTransporter } from './mail.transporter';
import {
  welcomeEmailTemplate,
  verifyOtpEmailTemplate,
  resetOtpEmailTemplate,
} from './templates/email.templates';
import type {
  SendMailOptions,
  UserCreatedEvent,
  PasswordResetEvent,
  OAuthUserCreatedEvent,
} from './types/mail.types';

@Injectable()
export class MailService {
  /**
   * Logger NestJS scopé à MailService.
   * Affiche le nom de la classe dans chaque ligne de log
   * pour faciliter le filtrage en production.
   */
  private readonly logger = new Logger(MailService.name);

  /**
   * Instance du transporter SMTP Nodemailer.
   * Créée une seule fois dans le constructeur et réutilisée
   * pour tous les envois (connexion SMTP persistante).
   */
  private readonly transporter: Transporter<SentMessageInfo>;

  constructor() {
    this.transporter = createTransporter();
  }

  // ══════════════════════════════════════════════════════════
  // 🔒 HELPER PRIVÉ — Envoi SMTP centralisé
  // ══════════════════════════════════════════════════════════

  /**
   * sendMail()
   *
   * Wrapper autour de transporter.sendMail() avec gestion
   * d'erreur centralisée pour tous les handlers d'événements.
   *
   * 💡 Pourquoi ne pas laisser les handlers gérer eux-mêmes ?
   *    Centraliser le try/catch ici garantit qu'aucun handler
   *    ne peut oublier de catcher une erreur SMTP et faire
   *    planter l'application à cause d'un email en échec.
   *
   * 💡 L'adresse expéditrice (from) est injectée ici depuis
   *    les variables d'environnement, pas dans les handlers,
   *    pour éviter la duplication et faciliter le changement.
   *
   * @param options → { to, subject, html } (voir SendMailOptions)
   */
  private async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SENDER_EMAIL ?? '',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`✅ Email envoyé à : ${options.to}`);
    } catch (error) {
      /**
       * On logue l'erreur sans la propager.
       * Un échec d'envoi d'email ne doit jamais interrompre
       * le flux métier de l'application (inscription, reset…).
       */
      this.logger.error(
        `❌ Échec d'envoi à : ${options.to}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ══════════════════════════════════════════════════════════
  // 📮 HANDLERS D'ÉVÉNEMENTS
  // ══════════════════════════════════════════════════════════

  /**
   * handleUserCreated()
   *
   * Déclenché par l'événement « user.created » émis dans
   * AuthService lors d'une inscription classique.
   *
   * 🔀 Envoie 2 emails séquentiels :
   *    1. Email de bienvenue personnalisé
   *    2. Email avec le code OTP de vérification d'email
   *
   * 💡 Les emails sont envoyés en séquence (await) et non en
   *    parallèle (Promise.all) pour préserver l'ordre de réception
   *    et éviter de saturer la connexion SMTP simultanément.
   *
   * 💡 firstName ?? 'Utilisateur' → valeur de secours si le
   *    champ est absent du payload pour ne pas crasher le template.
   *
   * @param payload → { email, firstName?, otp }
   */
  @OnEvent('user.created')
  async handleUserCreated(payload: UserCreatedEvent): Promise<void> {
    const name = payload.firstName ?? 'Utilisateur';

    // ── Email 1 : Bienvenue ───────────────────────────────────
    await this.sendMail({
      to: payload.email,
      subject: '🚀 Bienvenue sur nestjs-saas-starter !',
      html: welcomeEmailTemplate(name),
    });

    // ── Email 2 : Code de vérification OTP ───────────────────
    await this.sendMail({
      to: payload.email,
      subject: '🔐 Votre code de vérification',
      html: verifyOtpEmailTemplate(name, payload.otp),
    });
  }

  /**
   * handlePasswordReset()
   *
   * Déclenché par l'événement « password.reset » émis dans
   * AuthService lors d'une demande de réinitialisation.
   *
   * 🔀 Envoie 1 email :
   *    1. Email avec le code OTP de réinitialisation
   *
   * @param payload → { email, firstName?, otp }
   */
  @OnEvent('password.reset')
  async handlePasswordReset(payload: PasswordResetEvent): Promise<void> {
    const name = payload.firstName ?? 'Utilisateur';

    // ── Email 1 : Code de réinitialisation OTP ────────────────
    await this.sendMail({
      to: payload.email,
      subject: '🔑 Réinitialisation de votre mot de passe',
      html: resetOtpEmailTemplate(name, payload.otp),
    });
  }

  /**
   * handleOAuthUserCreated()
   *
   * Déclenché par l'événement « user.oauth.created » émis dans
   * OAuthService lors d'une première connexion Google.
   *
   * 🔀 Envoie 1 email :
   *    1. Email de bienvenue uniquement
   *
   * 💡 Pas d'OTP ici : l'email OAuth est garanti valide par
   *    le fournisseur (Google). Aucune vérification nécessaire.
   *    Différence structurelle clé avec handleUserCreated().
   *
   * @param payload → { email, firstName? }
   */
  @OnEvent('user.oauth.created')
  async handleOAuthUserCreated(payload: OAuthUserCreatedEvent): Promise<void> {
    const name = payload.firstName ?? 'Utilisateur';

    // ── Email 1 : Bienvenue ───────────────────────────────────
    await this.sendMail({
      to: payload.email,
      subject: '🚀 Bienvenue sur nestjs-saas-starter !',
      html: welcomeEmailTemplate(name),
    });
  }
}
