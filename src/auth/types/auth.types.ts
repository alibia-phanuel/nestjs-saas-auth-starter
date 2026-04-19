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
