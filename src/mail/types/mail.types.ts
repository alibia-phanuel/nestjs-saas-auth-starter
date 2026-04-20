export interface UserCreatedEvent {
  email: string;
  firstName?: string;
  otp: string;
}
export interface OAuthUserCreatedEvent {
  email: string;
  firstName?: string;
}
export interface PasswordResetEvent {
  email: string;
  firstName?: string;
  otp: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}
