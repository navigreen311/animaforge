import { Express, Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { v4 as uuidv4 } from 'uuid';
import { SERVICE_ROUTES } from './config/routes';
import { authLimiter, generationLimiter } from './middleware/rateLimiter';

export function setupProxies(app: Express): void {
  for (const [path, route] of Object.entries(SERVICE_ROUTES)) {
    const proxyOptions: Options = {
      target: route.target,
      changeOrigin: true,
      ws: route.ws || false,
      on: {
        proxyReq: (proxyReq, req) => {
          const requestId = (req as Request).headers['x-request-id'] || uuidv4();
          proxyReq.setHeader('x-request-id', requestId as string);
        },
        error: (err, req, res) => {
          console.error(`[proxy] Error proxying to ${route.name}:`, err.message);
          if (res && 'writeHead' in res && typeof (res as Response).status === 'function') {
            (res as Response).status(502).json({
              error: 'Bad Gateway',
              message: `Service "${route.name}" is unavailable.`,
            });
          }
        },
      },
    };

    if (path === '/auth') {
      app.use(path, authLimiter, createProxyMiddleware(proxyOptions));
    } else if (path === '/ai/v1') {
      app.use(path, generationLimiter, createProxyMiddleware(proxyOptions));
    } else {
      app.use(path, createProxyMiddleware(proxyOptions));
    }

    console.log(`[proxy] ${path} -> ${route.target} (${route.name})`);
  }
}
