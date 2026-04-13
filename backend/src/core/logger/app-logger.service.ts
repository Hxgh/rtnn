import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  trace?: string;
  timestamp: string;
}

@Injectable()
export class AppLogger extends ConsoleLogger {
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  log(message: unknown, context?: string): void {
    this.printPayload('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.printPayload('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.printPayload('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.printPayload('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.printPayload('verbose', message, context);
  }

  private printPayload(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    if (this.muted) {
      return;
    }
    const normalized = this.normalizeMessage(message);
    const payload: LogPayload = {
      level,
      message: normalized.message,
      context,
      data: normalized.data,
      trace,
      timestamp: new Date().toISOString(),
    };
    const serialized = JSON.stringify(payload);
    process.stdout.write(`${serialized}\n`);
  }

  private normalizeMessage(message: unknown): {
    message: string;
    data?: Record<string, unknown>;
  } {
    if (typeof message === 'string') {
      return { message };
    }
    if (this.isObjectRecord(message)) {
      return { message: 'structured-log', data: message };
    }
    return { message: String(message) };
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
