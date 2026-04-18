/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

// ── Event Payloads ────────────────────────────────────

interface UserCreatedEvent {
  email: string;
  firstName?: string;
  otp: string;
}

interface PasswordResetEvent {
  email: string;
  firstName?: string;
  otp: string;
}

// ── SendMail Options ──────────────────────────────────

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

// ─────────────────────────────────────────────────────

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter<SentMessageInfo>;

  constructor() {
    this.transporter = createTransporter();
  }

  // ── Helper privé ──────────────────────────────────

  private async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SENDER_EMAIL ?? '',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`✅ Email sent to: ${options.to}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to: ${options.to}`,
        error instanceof Error ? error.message : String(error),
      );
      // On ne throw pas — un échec email ne bloque pas l'API
    }
  }

  // ── Rappel Module 20 (13:35:43 Event Emitter) ────────
  // @OnEvent écoute les événements émis par EventEmitter2
  // AuthService émet → MailService reçoit — découplage total

  @OnEvent('user.created')
  async handleUserCreated(payload: UserCreatedEvent): Promise<void> {
    const name = payload.firstName ?? 'Utilisateur';

    // 1. Email de bienvenue
    await this.sendMail({
      to: payload.email,
      subject: '🚀 Bienvenue sur nestjs-saas-starter !',
      html: welcomeEmailTemplate(name),
    });

    // 2. Email OTP de vérification
    await this.sendMail({
      to: payload.email,
      subject: '🔐 Votre code de vérification',
      html: verifyOtpEmailTemplate(name, payload.otp),
    });
  }

  @OnEvent('password.reset')
  async handlePasswordReset(payload: PasswordResetEvent): Promise<void> {
    const name = payload.firstName ?? 'Utilisateur';

    await this.sendMail({
      to: payload.email,
      subject: '🔑 Réinitialisation de votre mot de passe',
      html: resetOtpEmailTemplate(name, payload.otp),
    });
  }
}
