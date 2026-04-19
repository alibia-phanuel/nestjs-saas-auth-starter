// Mock complet de otplib pour les tests
// Évite les problèmes ESM avec @noble/hashes et @scure

export const authenticator = {
  generateSecret: jest.fn(() => 'MOCK_SECRET_BASE32'),
  keyuri: jest.fn(
    (email: string, service: string, secret: string) =>
      `otpauth://totp/${service}:${email}?secret=${secret}`,
  ),
  verify: jest.fn(() => true),
};
