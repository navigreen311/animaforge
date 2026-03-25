type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  [key: string]: any;
}

export function createLogger(serviceName: string) {
  const log = (level: LogLevel, message: string, meta?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      ...meta,
    };
    const output = process.env.NODE_ENV === 'production' ? JSON.stringify(entry) : `[${entry.timestamp}] ${level.toUpperCase()} [${serviceName}] ${message} ${meta ? JSON.stringify(meta) : ''}`;
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
  };

  return {
    debug: (msg: string, meta?: Record<string, any>) => log('debug', msg, meta),
    info: (msg: string, meta?: Record<string, any>) => log('info', msg, meta),
    warn: (msg: string, meta?: Record<string, any>) => log('warn', msg, meta),
    error: (msg: string, meta?: Record<string, any>) => log('error', msg, meta),
    child: (defaultMeta: Record<string, any>) => createLogger(serviceName), // simplified
  };
}
