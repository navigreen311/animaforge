import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '../create-bus';

function fakeLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('createEventBus selection', () => {
  it('falls back to the memory bus when no brokers are configured', () => {
    const logger = fakeLogger();
    const { backend, reason } = createEventBus({
      source: 'test',
      env: {},
      logger,
    });

    expect(backend).toBe('memory');
    expect(reason).toBe('no-brokers-configured');
  });

  it('selects kafka when brokers are configured', () => {
    const { backend, reason } = createEventBus({
      source: 'test',
      env: { KAFKA_BROKERS: 'localhost:9092' },
      logger: fakeLogger(),
    });

    expect(backend).toBe('kafka');
    expect(reason).toBe('brokers-configured');
  });

  it('honours an explicit memory override even with brokers present', () => {
    const { backend, reason } = createEventBus({
      source: 'test',
      env: { KAFKA_BROKERS: 'localhost:9092', EVENT_BUS_BACKEND: 'memory' },
      logger: fakeLogger(),
    });

    expect(backend).toBe('memory');
    expect(reason).toBe('explicit');
  });

  it('rejects an unrecognised backend name', () => {
    expect(() =>
      createEventBus({
        source: 'test',
        env: { EVENT_BUS_BACKEND: 'rabbitmq' },
        logger: fakeLogger(),
      }),
    ).toThrow(/must be "kafka" or "memory"/);
  });

  it('rejects kafka without brokers instead of quietly degrading', () => {
    expect(() =>
      createEventBus({
        source: 'test',
        env: { EVENT_BUS_BACKEND: 'kafka' },
        logger: fakeLogger(),
      }),
    ).toThrow(/KAFKA_BROKERS is empty/);
  });
});

describe('createEventBus announcements', () => {
  it('always announces the backend it chose', () => {
    const logger = fakeLogger();
    const { announcement } = createEventBus({
      source: 'gateway',
      env: {},
      logger,
    });

    expect(announcement).toMatch(/gateway/);
    expect(announcement).toMatch(/in-process/);
    expect(logger.warn).toHaveBeenCalledWith(announcement);
  });

  it('warns rather than informs when falling back in development', () => {
    const logger = fakeLogger();
    createEventBus({ source: 'test', env: {}, logger });

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs at info when kafka is selected', () => {
    const logger = fakeLogger();
    createEventBus({
      source: 'test',
      env: { KAFKA_BROKERS: 'localhost:9092' },
      logger,
    });

    expect(logger.info).toHaveBeenCalledOnce();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('createEventBus production safety', () => {
  it('refuses the memory backend in production', () => {
    expect(() =>
      createEventBus({
        source: 'workers',
        env: { NODE_ENV: 'production' },
        logger: fakeLogger(),
      }),
    ).toThrow(/in-process backend under NODE_ENV=production/);
  });

  it('names the missing broker config in the refusal', () => {
    expect(() =>
      createEventBus({
        source: 'workers',
        env: { NODE_ENV: 'production' },
        logger: fakeLogger(),
      }),
    ).toThrow(/KAFKA_BROKERS is not set/);
  });

  it('refuses an explicit production memory bus too', () => {
    expect(() =>
      createEventBus({
        source: 'workers',
        env: { NODE_ENV: 'production', EVENT_BUS_BACKEND: 'memory' },
        logger: fakeLogger(),
      }),
    ).toThrow(/set explicitly/);
  });

  it('allows the override but still logs it at error level', () => {
    const logger = fakeLogger();
    const { backend } = createEventBus({
      source: 'workers',
      env: {
        NODE_ENV: 'production',
        EVENT_BUS_ALLOW_MEMORY_IN_PRODUCTION: 'true',
      },
      logger,
    });

    expect(backend).toBe('memory');
    // Once for the explanation, once for the announcement — both at error.
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not interfere with kafka in production', () => {
    const logger = fakeLogger();
    const { backend } = createEventBus({
      source: 'workers',
      env: { NODE_ENV: 'production', KAFKA_BROKERS: 'broker-1:9092' },
      logger,
    });

    expect(backend).toBe('kafka');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
