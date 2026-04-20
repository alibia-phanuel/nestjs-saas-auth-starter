import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

// ── Type strict pour le profil Google ────────────────
interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: { givenName: string; familyName: string };
  photos: Array<{ value: string }>;
}

export interface GoogleUser {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  photo: string;
}

// ─────────────────────────────────────────────────────

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
      scope: ['email', 'profile'],
    });
  }

  // Rappel Module 6 — validate() est appelée automatiquement
  // après que Google a authentifié l'utilisateur
  // Ce qu'on retourne ici est injecté dans req.user
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void {
    const { id, name, emails, photos } = profile;

    const user: GoogleUser = {
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      photo: photos[0]?.value ?? '',
    };

    done(null, user);
  }
}
