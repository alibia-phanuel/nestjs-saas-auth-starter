/**
 * ============================================================
 * INTERCEPTOR — ResponseInterceptor (Format de réponse unifié)
 * ============================================================
 *
 * Transforme toutes les réponses de succès en un format
 * standardisé cohérent pour le frontend.
 *
 * 💡 Rappel Module 20 (13:47:13)
 *    map() dans RxJS transforme la valeur émise par l'Observable.
 *    Contrairement à tap() qui ne fait qu'observer,
 *    map() modifie la valeur retournée au client.
 *
 * 🔄 Sans interceptor :
 *    { key: "auth.login_success", accessToken: "..." }
 *
 * 🔄 Avec interceptor :
 *    {
 *      success: true,
 *      statusCode: 200,
 *      data: { key: "auth.login_success", accessToken: "..." },
 *      timestamp: "2026-04-20T10:30:00.000Z"
 *    }
 *
 * 💡 Note : On peut désactiver cet interceptor sur certains
 *    endpoints avec un décorateur @SkipResponseTransform()
 *    si le frontend a besoin du format brut.
 * ============================================================
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

/** Format standardisé de toutes les réponses de succès */
interface StandardResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
}

/**
 * ResponseInterceptor
 *
 * Transforme les réponses de succès en format standardisé.
 * Enregistré globalement dans main.ts.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  /**
   * intercept()
   *
   * map() transforme la donnée retournée par le handler
   * en un objet standardisé avec success, statusCode et data.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    // On ignore GraphQL (Apollo gère son propre format)
    if (context.getType<'graphql'>() === 'graphql') {
      return next.handle() as Observable<StandardResponse<T>>;
    }

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: T) => ({
        success: true as const,
        statusCode: response.statusCode,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
