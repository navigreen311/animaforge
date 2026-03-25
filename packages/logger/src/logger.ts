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

export function createLogger(serviceName: string, options?: Partial<LoggerOptions>): Logger {
  return pino({
    ...defaultOptions,
    ...options,
    base: { service: serviceName },
  });
}

export const logger = createLogger('animaforge');
export type { Logger } from 'pino';
