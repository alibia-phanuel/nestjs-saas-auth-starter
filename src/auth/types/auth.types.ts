// ── Types partagés Auth ───────────────────────────────

export interface Setup2FAResult {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
}

export interface MessageResponse {
  key: string;
  message: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  rawKey: string;
  key: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ApiKeySafe {
  id: string;
  name: string;
  isActive: boolean;
  lastUsed: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}
export interface JwtUser {
  id: string;
  email: string;
}

export interface ValidatedUser {
  id: string;
  email: string;
  status: string;
  emailVerified: boolean;
}
