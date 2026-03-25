export interface ServiceRoute {
  target: string;
  name: string;
  ws?: boolean;
}

export const SERVICE_ROUTES: Record<string, ServiceRoute> = {
  '/api/v1': { target: 'http://localhost:3001', name: 'platform-api' },
  '/ai/v1': { target: 'http://localhost:8001', name: 'ai-api' },
  '/auth': { target: 'http://localhost:3003', name: 'auth' },
  '/billing': { target: 'http://localhost:3004', name: 'billing' },
  '/governance': { target: 'http://localhost:3005', name: 'governance' },
  '/ws': { target: 'http://localhost:3002', name: 'realtime', ws: true },
  '/notifications': { target: 'http://localhost:3009', name: 'notification' },
  '/search': { target: 'http://localhost:3010', name: 'search' },
  '/analytics': { target: 'http://localhost:3011', name: 'analytics' },
};
