import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '../src/common/logger/logger.service';

// ✅ Suppression de tous les imports @jest/globals et expect
// On utilise uniquement les globaux Jest injectés par @types/jest
// Mélanger les deux sources crée des conflits de types

describe('AppLoggerService', () => {
  let service: AppLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppLoggerService],
    }).compile();

    service = module.get<AppLoggerService>(AppLoggerService);
  });

  it('should log a message', () => {
    // ✅ mockImplementation(() => {}) au lieu de mockImplementation()
    // @types/jest exige une fonction en argument, même vide
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    service.log('test message', 'TestContext');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log an error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    service.error('error message', 'stack trace', 'TestContext');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log a warning', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    service.warn('warn message', 'TestContext');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log debug in development', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    service.debug('debug message', 'TestContext');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log request info', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    service.logRequest({
      method: 'GET',
      path: '/test',
      statusCode: 200,
      duration: 45,
      ip: '127.0.0.1',
      userId: 'uuid-123',
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log warn for 4xx responses', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    service.logRequest({
      method: 'POST',
      path: '/auth/login',
      statusCode: 401,
      duration: 30,
      ip: '127.0.0.1',
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
