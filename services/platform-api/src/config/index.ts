import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  // `jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me'` was here and
  // was read by nothing -- so it never caused the bypass, but it did advertise
  // a fallback that must not exist. The secret is now read, without a default,
  // in middleware/auth.ts, which is the only place that needs it.
  version: '0.1.0',
} as const;
