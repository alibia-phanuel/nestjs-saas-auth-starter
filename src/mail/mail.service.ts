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
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter<SentMessageInfo>;

  constructor() {
    this.transporter = createTransporter();
  }

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
      this.logger.error(
        `❌ Échec d'envoi à : ${options.to}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @OnEvent('user.created')
  async handleUserCreated(payload: UserCreatedEvent): Promise<void> {
    const name = payload.firstName ?? 'Utilisateur';

    await this.sendMail({
      to: payload.email,
      subject: '🚀 Bienvenue sur nestjs-saas-starter !',
      html: welcomeEmailTemplate(name),
    });

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
  @OnEvent('user.oauth.created')
  async handleOAuthUserCreated(payload: OAuthUserCreatedEvent): Promise<void> {
    const name = payload.firstName ?? 'Utilisateur';

    await this.sendMail({
      to: payload.email,
      subject: '🚀 Bienvenue sur nestjs-saas-starter !',
      html: welcomeEmailTemplate(name),
    });
  }
}
