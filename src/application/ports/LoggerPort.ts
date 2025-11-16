export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void | Promise<void>;
  warn(message: string, context?: Record<string, unknown>): void | Promise<void>;
  error(message: string, context?: Record<string, unknown>): void | Promise<void>;
  debug?(message: string, context?: Record<string, unknown>): void | Promise<void>;
}


