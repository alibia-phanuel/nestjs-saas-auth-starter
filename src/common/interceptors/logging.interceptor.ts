/**
 * ============================================================
 * INTERCEPTOR — LoggingInterceptor
 * ============================================================
 *
 * Intercepte chaque requête HTTP et log les informations
 * de la requête et de la réponse de manière structurée.
 *
 * 💡 Rappel Module 20 (13:47:13 Streaming)
 *    Un interceptor NestJS s'exécute avant ET après le handler.
 *    Il utilise RxJS Observable pour intercepter le flux.
 *
 * 🔄 Flux d'exécution :
 *    ─────────────────────────────────────────────────────
 *    1. Requête entrante → intercept() est appelé
 *    2. On enregistre le timestamp de début
 *    3. next.handle() → passe au handler (controller)
 *    4. tap() → s'exécute APRÈS la réponse du handler
 *    5. On calcule la durée et on log le résultat
 *    ─────────────────────────────────────────────────────
 *
 * 💡 RxJS tap() vs map() :
 *    - tap()  → effet de bord, ne modifie PAS la réponse
 *    - map()  → transforme la réponse
 *    On utilise tap() car on veut juste logger sans modifier.
 *
 * 💡 Informations loggées :
 *    - Méthode HTTP (GET, POST...)
 *    - Path de l'endpoint
 *    - Status code de la réponse
 *    - Durée de traitement en ms
 *    - IP du client
 *    - UserId si authentifié
 * ============================================================
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/** Structure de la requête Express avec user optionnel */
interface RequestWithUser extends Request {
  user?: { id?: string };
}

/**
 * LoggingInterceptor
 *
 * Interceptor global qui log toutes les requêtes HTTP.
 * Enregistré globalement dans main.ts via app.useGlobalInterceptors().
 *
 * 💡 @Injectable() → NestJS peut l'injecter automatiquement
 *    et résoudre ses dépendances (AppLoggerService ici).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * intercept()
   *
   * Méthode principale de l'interceptor.
   * Wraps le handler avec un before/after hook.
   *
   * @param context → contexte d'exécution NestJS
   * @param next    → handler suivant dans la chaîne
   * @returns       → Observable de la réponse
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // On ignore les requêtes GraphQL (loggées séparément)
    if (context.getType<'graphql'>() === 'graphql') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, path, ip } = request;
    const userId = request.user?.id;

    // Timestamp de début — pour calculer la durée
    const startTime = Date.now();

    /**
     * tap() s'exécute après que le handler a retourné sa réponse.
     * On calcule la durée et on log le résultat.
     *
     * () => { ... } → fonction exécutée après la réponse
     */
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.logger.logRequest({
          method,
          path,
          statusCode,
          duration,
          ip: ip ?? 'unknown',
          userId,
        });
      }),
    );
  }
}
