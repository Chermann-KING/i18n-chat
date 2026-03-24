import { Injectable, LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

/** Maps NestJS log levels to pino levels. */
const LEVEL_MAP = {
  log: 'info',
  error: 'error',
  warn: 'warn',
  debug: 'debug',
  verbose: 'trace',
} as const;

type NestLevel = keyof typeof LEVEL_MAP;

/**
 * Structured JSON logger backed by [Pino](https://getpino.io/).
 *
 * In development (`NODE_ENV !== 'production'`) output is piped through
 * `pino-pretty` for human-readable logs. In production, raw JSON is emitted
 * to stdout so log aggregators (Loki, Elastic, …) can parse it without
 * additional configuration.
 *
 * Usage: pass an instance to `app.useLogger()` in `main.ts`.
 */
@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    const isDev = process.env.NODE_ENV !== 'production';

    this.logger = pino({
      level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
      ...(isDev && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
    });
  }

  /** Logs an informational message (NestJS `log` level → pino `info`). */
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  /** Logs an error message with optional stack trace. */
  error(message: unknown, trace?: string, context?: string): void {
    this.logger[LEVEL_MAP.error]({ context, trace }, String(message));
  }

  /** Logs a warning. */
  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  /** Logs a debug message (suppressed in production by default). */
  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  /** Logs a verbose/trace message. */
  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  /**
   * Writes a log entry at the mapped pino level.
   *
   * @param nestLevel - The NestJS log level.
   * @param message - The message to log.
   * @param context - Optional NestJS context label (class / module name).
   */
  private write(nestLevel: NestLevel, message: unknown, context?: string): void {
    this.logger[LEVEL_MAP[nestLevel]]({ context }, String(message));
  }
}
