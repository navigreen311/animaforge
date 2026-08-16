import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { globalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { authForward, assertAuthConfigured } from './middleware/authForward';
import { buildCorsOptions } from './middleware/cors';
import { setupProxies } from './proxy';
import { adminRouter } from './routes/admin';
import { serviceRegistry } from './services/serviceRegistry';
import { SERVICE_ROUTES } from './config/routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(express.json());
  app.use(morgan('combined'));

  // authForward must run before anything that reads an identity header. It
  // strips client-supplied `x-user-*` and re-sets them only from a verified
  // token; the rate limiter keys its buckets on `x-user-id` and the request
  // logger records it. When the limiter ran first (as it did until this was
  // fixed) a caller could choose their own rate-limit bucket, or poison
  // another user's, by sending the header themselves.
  app.use(authForward);
  app.use(globalLimiter);
  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
  });

  // Admin routes for service management and metrics
  app.use('/admin', adminRouter);

  setupProxies(app);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[gateway] Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return app;
}

/** Seed the service registry from the static route table. */
function seedRegistry(): void {
  for (const [path, route] of Object.entries(SERVICE_ROUTES)) {
    serviceRegistry.registerService(route.name, route.target, '/health');
  }
  serviceRegistry.startPolling();
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  // Fail here, loudly, rather than accepting traffic and forwarding every
  // request unauthenticated because the secret was never set.
  assertAuthConfigured();
  const app = createApp();
  seedRegistry();
  app.listen(PORT, () => {
    console.log(`[gateway] API Gateway listening on port ${PORT}`);
  });
}
