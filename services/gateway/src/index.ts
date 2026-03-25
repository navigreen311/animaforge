import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { globalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { authForward } from './middleware/authForward';
import { setupProxies } from './proxy';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('combined'));
  app.use(globalLimiter);
  app.use(authForward);
  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
  });

  setupProxies(app);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[gateway] Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return app;
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[gateway] API Gateway listening on port ${PORT}`);
  });
}
