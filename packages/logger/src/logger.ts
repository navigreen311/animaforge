import pino, { Logger, LoggerOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const defaultOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
};

/**
 * Create a structured JSON logger for a given service.
 * In development, logs are pretty-printed. In production, logs are JSON.
 */
export function createLogger(serviceName: string, options?: Partial<LoggerOptions>): Logger {
  return pino({
    ...defaultOptions,
    ...options,
    base: {
      service: serviceName,
    },
  });
}

/** Shared root logger instance for the platform */
export const logger = createLogger('animaforge');

export type { Logger } from 'pino';
