import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../logger';
import { sanitize } from '../errorLogger';
import { MetricsCollector } from '../metrics';

// ---------- Logger output format ----------
describe('createLogger', () => {
  it('should create a logger with the given service name', () => {
    const log = createLogger('test-service');
    expect(log).toBeDefined();
    // pino exposes bindings()
    const bindings = log.bindings();
    expect(bindings.service).toBe('test-service');
  });

  it('should support all standard log levels', () => {
    const log = createLogger('level-test');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.fatal).toBe('function');
  });
});

// ---------- Child logger context ----------
describe('child logger', () => {
  it('should propagate parent service binding to child', () => {
    const parent = createLogger('parent-svc');
    const child = parent.child({ requestId: 'req-123', userId: 'user-456' });
    const bindings = child.bindings();
    expect(bindings.service).toBe('parent-svc');
    expect(bindings.requestId).toBe('req-123');
    expect(bindings.userId).toBe('user-456');
  });
});

// ---------- Request logging ----------
describe('requestLogger middleware', () => {
  it('should attach requestId and child logger to req', async () => {
    // Dynamic import to avoid Express type issues at test time
    const { requestLogger } = await import('../requestLogger');
    const log = createLogger('req-test');

    const req: any = {
      headers: {},
      path: '/api/test',
      method: 'GET',
      originalUrl: '/api/test',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res: any = {
      setHeader: vi.fn(),
      on: vi.fn(),
      statusCode: 200,
    };
    const next = vi.fn();

    const middleware = requestLogger({ logger: log });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.id).toBeDefined();
    expect(typeof req.id).toBe('string');
    expect(req.log).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
  });
});

// ---------- Error sanitization ----------
describe('sanitize', () => {
  it('should redact sensitive fields', () => {
    const input = {
      username: 'alice',
      password: 'super-secret',
      data: {
        token: 'jwt-abc',
        safe: 'visible',
      },
    };
    const result = sanitize(input);
    expect(result.username).toBe('alice');
    expect(result.password).toBe('[REDACTED]');
    expect((result.data as any).token).toBe('[REDACTED]');
    expect((result.data as any).safe).toBe('visible');
  });

  it('should handle null and primitive values safely', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
    expect(sanitize('hello')).toBe('hello');
    expect(sanitize(42)).toBe(42);
  });
});

// ---------- Metrics counters ----------
describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should increment counters correctly', () => {
    collector.counter('http_requests_total');
    collector.counter('http_requests_total');
    collector.counter('http_requests_total', 3);
    const m = collector.getMetrics() as any;
    expect(m.counters.http_requests_total).toBe(5);
  });

  it('should track histogram distributions', () => {
    collector.histogram('http_request_duration_ms', 50);
    collector.histogram('http_request_duration_ms', 200);
    collector.histogram('http_request_duration_ms', 800);
    const m = collector.getMetrics() as any;
    const h = m.histograms.http_request_duration_ms;
    expect(h.count).toBe(3);
    expect(h.sum).toBe(1050);
    expect(h.min).toBe(50);
    expect(h.max).toBe(800);
  });

  it('should set gauge values', () => {
    collector.gauge('active_websocket_connections', 5);
    collector.gauge('active_websocket_connections', 3);
    const m = collector.getMetrics() as any;
    expect(m.gauges.active_websocket_connections).toBe(3);
  });
});
