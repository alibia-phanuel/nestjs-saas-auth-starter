import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from '../i18n.service';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nService],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  // ─── translate() ─────────────────────────────

  describe('translate()', () => {
    it('should return english translation by default', () => {
      const result = service.translate('auth.invalid_credentials');
      expect(result).toBe('Invalid email or password');
    });

    it('should return french translation when lang is fr', () => {
      const result = service.translate('auth.invalid_credentials', 'fr');
      expect(result).toBe('Email ou mot de passe incorrect');
    });

    it('should return the key itself when translation not found', () => {
      const result = service.translate('auth.nonexistent_key');
      expect(result).toBe('auth.nonexistent_key');
    });

    it('should support nested keys', () => {
      const result = service.translate('users.not_found', 'fr');
      expect(result).toBe('Utilisateur introuvable');
    });

    it('should fallback to english when lang not supported', () => {
      const result = service.translate('auth.login_success', 'ar');
      expect(result).toBe('Login successful');
    });
  });

  // ─── createResponse() ────────────────────────

  describe('createResponse()', () => {
    it('should return object with key and message in english', () => {
      const result = service.createResponse('auth.login_success');
      expect(result).toEqual({
        key: 'auth.login_success',
        message: 'Login successful',
      });
    });

    it('should return message in french when lang is fr', () => {
      const result = service.createResponse('auth.login_success', 'fr');
      expect(result).toEqual({
        key: 'auth.login_success',
        message: 'Connexion réussie',
      });
    });
  });
});
