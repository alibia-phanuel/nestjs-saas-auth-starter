import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  @OnEvent('user.created')
  handleUserCreated(payload: UserCreatedEvent): void {
    this.logger.log(`📧 Sending verification OTP to: ${payload.email}`);
    this.logger.log(`🔑 OTP Code: ${payload.otp}`);

    // TODO : brancher nodemailer
    // Template : "Votre code de vérification est : XXXXXX"
    // Valable 15 minutes
  }

  @OnEvent('password.reset')
  handlePasswordReset(payload: PasswordResetEvent): void {
    this.logger.log(`📧 Sending password reset OTP to: ${payload.email}`);
    this.logger.log(`🔑 Reset OTP: ${payload.otp}`);

    // TODO : brancher nodemailer
  }
}
