type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: number;

  constructor(level: LogLevel = "info") {
    this.level = LOG_LEVELS[level];
  }

  setLevel(level: LogLevel): void {
    this.level = LOG_LEVELS[level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (meta !== undefined) {
      return `${base} ${JSON.stringify(meta)}`;
    }
    return base;
  }

  debug(message: string, meta?: unknown): void {
    if (this.level <= LOG_LEVELS.debug) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, meta?: unknown): void {
    if (this.level <= LOG_LEVELS.info) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: unknown): void {
    if (this.level <= LOG_LEVELS.warn) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  error(message: string, meta?: unknown): void {
    if (this.level <= LOG_LEVELS.error) {
      console.error(this.formatMessage("error", message, meta));
    }
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || "info"
);
