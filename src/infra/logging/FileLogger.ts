import { promises as fs } from 'fs';
import path from 'path';
import { LoggerPort } from '../../application/ports/LoggerPort';

export interface FileLoggerOptions {
  /**
   * Diretório base onde os arquivos de log serão gravados.
   * Default: ./logs
   */
  directory?: string;
  /**
   * Prefixo do nome do arquivo.
   * Exemplo: mercuius-js-2025-11-16.log
   */
  filePrefix?: string;
}

export class FileLogger implements LoggerPort {
  private readonly directory: string;
  private readonly filePrefix: string;
  private initialized = false;

  constructor(options: FileLoggerOptions = {}) {
    this.directory = options.directory ?? process.env.MERCUIUS_LOG_DIR ?? path.resolve('logs');
    this.filePrefix = options.filePrefix ?? 'mercuius-js';
  }

  private async ensureDir(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(this.directory, { recursive: true });
    this.initialized = true;
  }

  private getCurrentFilePath(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const fileName = `${this.filePrefix}-${date}.log`;
    return path.join(this.directory, fileName);
  }

  private async write(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.ensureDir();
      const now = new Date().toISOString();
      const ctx = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
      const line = `${now} [${level.toUpperCase()}] ${message}${ctx}\n`;
      const filePath = this.getCurrentFilePath();
      await fs.appendFile(filePath, line, { encoding: 'utf8' });
    } catch {
      // Se falhar para escrever, não devemos quebrar o fluxo do worker.
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    void this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    void this.write('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    void this.write('error', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    void this.write('debug', message, context);
  }
}


