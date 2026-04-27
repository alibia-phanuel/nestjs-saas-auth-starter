/**
 * ============================================================
 * SERVICE — LoggerService (Logging structuré)
 * ============================================================
 *
 * Service de logging structuré JSON pour la production.
 * Chaque log contient des métadonnées contextuelles pour
 * faciliter le débogage et le monitoring.
 *
 * 💡 Logging structuré vs logging simple :
 *
 *    ❌ Logging simple (difficile à parser) :
 *    [2026-04-20] POST /auth/login → 401 Unauthorized
 *
 *    ✅ Logging structuré JSON (parseable par Datadog, etc.) :
 *    {
 *      "level": "warn",
 *      "timestamp": "2026-04-20T10:30:00.000Z",
 *      "context": "HTTP",
 *      "method": "POST",
 *      "path": "/auth/login",
 *      "statusCode": 401,
 *      "ip": "192.168.1.1",
 *      "duration": "45ms",
 *      "message": "Unauthorized"
 *    }
 *
 * 💡 Niveaux de log :
 *    error   → erreurs critiques (exceptions non gérées)
 *    warn    → avertissements (401, 403, 429)
 *    log     → informations générales (200, 201)
 *    debug   → détails de développement (désactivé en prod)
 *    verbose → très détaillé (jamais en prod)
 *
 * 💡 En production (NODE_ENV=production) :
 *    On utilise le format JSON pour les outils de monitoring.
 *    En développement, on garde le format lisible humain.
 * ============================================================
 */

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

/** Structure d'un log structuré */
interface LogEntry {
  level: 'error' | 'warn' | 'log' | 'debug' | 'verbose';
  timestamp: string;
  context?: string;
  message: string;
  [key: string]: unknown;
}

/**
 * AppLoggerService
 *
 * Implémente LoggerService de NestJS pour remplacer
 * le logger par défaut avec notre version structurée.
 *
 * @Injectable() → peut être injecté dans n'importe quel service
 */
@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  /**
   * formatLog()
   *
   * Formate un log en JSON (production) ou texte coloré (dev).
   *
   * @param entry → objet log structuré
   * @returns     → string formatée
   */
  private formatLog(entry: LogEntry): string {
    if (this.isProduction) {
      // Production → JSON parseable par les outils de monitoring
      return JSON.stringify(entry);
    }

    // Développement → format lisible humain avec couleurs
    const { level, timestamp, context, message, ...meta } = entry;
    const ctx = context ? `[${context}]` : '';
    const metaStr =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

    return `${timestamp} ${level.toUpperCase()} ${ctx} ${message}${metaStr}`;
  }

  /**
   * createEntry()
   *
   * Crée un objet log structuré avec timestamp automatique.
   *
   * @param level   → niveau de log
   * @param message → message principal
   * @param context → contexte (nom du service/controller)
   * @param meta    → métadonnées additionnelles
   */
  private createEntry(
    level: LogEntry['level'],
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      context,
      message,
      ...meta,
    };
  }

  // ── Implémentation de NestLoggerService ──────────────

  /**
   * log() — Niveau INFO
   * Utilisé pour les événements normaux (requêtes 200/201)
   */
  log(message: string, context?: string): void {
    const entry = this.createEntry('log', message, context);
    console.log(this.formatLog(entry));
  }

  /**
   * error() — Niveau ERROR
   * Utilisé pour les erreurs critiques et exceptions non gérées
   *
   * @param trace → stack trace de l'erreur (optionnel)
   */
  error(message: string, trace?: string, context?: string): void {
    const entry = this.createEntry('error', message, context, {
      trace: trace ?? null,
    });
    console.error(this.formatLog(entry));
  }

  /**
   * warn() — Niveau WARN
   * Utilisé pour les avertissements (401, 403, 429 rate limit)
   */
  warn(message: string, context?: string): void {
    const entry = this.createEntry('warn', message, context);
    console.warn(this.formatLog(entry));
  }

  /**
   * debug() — Niveau DEBUG
   * Utilisé en développement uniquement
   * Désactivé automatiquement en production
   */
  debug(message: string, context?: string): void {
    if (this.isProduction) return; // Jamais en production
    const entry = this.createEntry('debug', message, context);
    console.debug(this.formatLog(entry));
  }

  /**
   * verbose() — Niveau VERBOSE
   * Très détaillé — développement uniquement
   */
  verbose(message: string, context?: string): void {
    if (this.isProduction) return;
    const entry = this.createEntry('verbose', message, context);
    console.log(this.formatLog(entry));
  }

  // ── Méthodes utilitaires pour le logging HTTP ────────

  /**
   * logRequest()
   *
   * Log une requête HTTP entrante avec ses métadonnées.
   * Appelé par LoggingInterceptor pour chaque requête.
   *
   * @param method     → méthode HTTP (GET, POST...)
   * @param path       → chemin de l'endpoint
   * @param statusCode → code de réponse HTTP
   * @param duration   → durée de traitement en ms
   * @param ip         → adresse IP du client
   * @param userId     → id de l'utilisateur (si authentifié)
   */
  logRequest(params: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    ip: string;
    userId?: string;
  }): void {
    const { method, path, statusCode, duration, ip, userId } = params;

    const isSuccess = statusCode < 400;
    const isWarn = statusCode >= 400 && statusCode < 500;

    const meta: Record<string, unknown> = {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ip,
      ...(userId && { userId }),
    };

    const message = `${method} ${path} ${statusCode} - ${duration}ms`;

    if (isSuccess) {
      this.log(message, 'HTTP');
    } else if (isWarn) {
      const entry = this.createEntry('warn', message, 'HTTP', meta);
      console.warn(this.formatLog(entry));
    } else {
      const entry = this.createEntry('error', message, 'HTTP', meta);
      console.error(this.formatLog(entry));
    }
  }
}
