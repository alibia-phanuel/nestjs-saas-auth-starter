import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail.service';
import * as mailTransporter from '../mail.transporter';

// ── Mock du transporter ───────────────────────────────
// On mock createTransporter pour ne jamais envoyer de vrais emails
const mockSendMail = jest.fn();

jest.spyOn(mailTransporter, 'createTransporter').mockReturnValue({
  sendMail: mockSendMail,
} as never);

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
    jest.clearAllMocks();
  });

  // ── handleUserCreated() ──────────────────────────────

  describe('handleUserCreated()', () => {
    const payload = {
      email: 'phanuel@example.com',
      firstName: 'Phanuel',
      otp: '847392',
    };

    it('should send 2 emails on user.created event', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated(payload);

      // 2 emails : welcome + OTP
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    it('should send welcome email with correct subject', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated(payload);

      expect(mockSendMail).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          to: payload.email,
          subject: '🚀 Bienvenue sur nestjs-saas-starter !',
        }),
      );
    });

    it('should send OTP email with correct subject', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated(payload);

      expect(mockSendMail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          to: payload.email,
          subject: '🔐 Votre code de vérification',
        }),
      );
    });

    it('should use fallback name when firstName is undefined', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handleUserCreated({
        email: payload.email,
        otp: payload.otp,
        // firstName non fourni
      });

      // Doit quand même envoyer 2 emails sans crash
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    it('should not throw if sendMail fails', async () => {
      // Simule une erreur SMTP
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      // Ne doit PAS throw — l'API ne doit pas planter à cause d'un email
      await expect(service.handleUserCreated(payload)).resolves.not.toThrow();
    });
  });

  // ── handlePasswordReset() ────────────────────────────

  describe('handlePasswordReset()', () => {
    const payload = {
      email: 'phanuel@example.com',
      firstName: 'Phanuel',
      otp: '123456',
    };

    it('should send 1 email on password.reset event', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handlePasswordReset(payload);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it('should send reset email with correct subject', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'mock-id' });

      await service.handlePasswordReset(payload);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: payload.email,
          subject: '🔑 Réinitialisation de votre mot de passe',
        }),
      );
    });

    it('should not throw if sendMail fails', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      await expect(service.handlePasswordReset(payload)).resolves.not.toThrow();
    });
  });
});
