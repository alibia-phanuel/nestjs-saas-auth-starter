/**
 * ============================================================
 * FILTER — HttpExceptionFilter (Gestion globale des erreurs)
 * ============================================================
 *
 * Intercepte toutes les exceptions HTTP et les formate
 * de manière cohérente avec notre système i18n.
 *
 * 💡 Rappel Module 2 (00:32:39 Exception Filter)
 *    Tu as vu exactement ce concept en formation !
 *    Un ExceptionFilter intercepte les exceptions avant
 *    qu'elles ne soient envoyées au client et permet
 *    de personnaliser le format de la réponse d'erreur.
 *
 * 🔄 Flux sans ExceptionFilter :
 *    Exception → NestJS → { statusCode, message, error }
 *
 * 🔄 Flux avec ExceptionFilter :
 *    Exception → Filter → Format personnalisé i18n
 *    {
 *      statusCode: 401,
 *      key: "auth.invalid_credentials",
 *      message: "Invalid email or password",
 *      timestamp: "2026-04-20T10:30:00.000Z",
 *      path: "/auth/login"
 *    }
 *
 * 💡 @Catch(HttpException) → intercepte UNIQUEMENT les
 *    HttpException (et leurs sous-classes : UnauthorizedException,
 *    NotFoundException, ConflictException...).
 *    Les autres erreurs (TypeError, etc.) ne sont pas interceptées
 *    et remontent jusqu'au handler d'erreur global de NestJS.
 * ============================================================
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Structure de la réponse d'erreur standardisée
 * Cohérente avec notre système i18n message keys
 */
interface ErrorResponse {
  statusCode: number;
  key: string;
  message: string;
  timestamp: string;
  path: string;
}

/**
 * HttpExceptionFilter
 *
 * @Catch(HttpException) → s'applique à toutes les HttpException
 * Enregistré globalement dans main.ts
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * catch()
   *
   * Méthode appelée automatiquement quand une HttpException
   * est levée n'importe où dans l'application.
   *
   * @param exception → l'exception interceptée
   * @param host      → contexte d'arguments (request/response)
   */
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    /**
     * Extraction du message de l'exception
     *
     * getResponse() peut retourner :
     * - Une string simple : "Unauthorized"
     * - Un objet i18n : { key: "auth.invalid_credentials", message: "..." }
     * - Un objet de validation : { message: ["email must be an email"] }
     */
    const exceptionResponse = exception.getResponse();

    let key = 'common.internal_error';
    let message = 'An error occurred';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const resp = exceptionResponse as Record<string, unknown>;

      // Réponse i18n → { key, message }
      if (typeof resp['key'] === 'string') {
        key = resp['key'];
        message =
          typeof resp['message'] === 'string' ? resp['message'] : message;
      }
      // Erreurs de validation class-validator → { message: string[] }
      else if (Array.isArray(resp['message'])) {
        key = 'validation.required';
        message = (resp['message'] as string[]).join(', ');
      }
      // Réponse simple avec message
      else if (typeof resp['message'] === 'string') {
        message = resp['message'];
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      key,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log l'erreur avec le niveau approprié
    if (statusCode >= 500) {
      this.logger.error(
        `${statusCode} ${request.method} ${request.url} — ${message}`,
        exception.stack,
        'HttpExceptionFilter',
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${statusCode} ${request.method} ${request.url} — ${message}`,
        'HttpExceptionFilter',
      );
    }

    response.status(statusCode).json(errorResponse);
  }
}
