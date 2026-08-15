import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryEventBus } from '../memory-bus';
import { EventValidationError, type EventEnvelope } from '../events';

describe('MemoryEventBus', () => {
  let bus: MemoryEventBus;

  beforeEach(async () => {
    bus = new MemoryEventBus({ source: 'test', recordHistory: true });
    await bus.connect();
  });

  it('describes itself as not reaching Kafka or other services', () => {
    const description = bus.describe();
    expect(description).toMatch(/in-process/);
    expect(description).toMatch(/no other service/i);
  });

  it('delivers a published event to a matching subscriber', async () => {
    const seen: EventEnvelope[] = [];
    await bus.subscribe(['generation.started'], (e) => {
      seen.push(e);
    });

    await bus.publish('generation.started', {
      jobId: 'job-1',
      userId: 'user-1',
      projectId: 'proj-1',
      type: 'video',
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].payload.jobId).toBe('job-1');
  });

  it('does not deliver events a subscriber did not ask for', async () => {
    const seen: EventEnvelope[] = [];
    await bus.subscribe(['generation.completed'], (e) => {
      seen.push(e);
    });

    await bus.publish('generation.failed', {
      jobId: 'job-1',
      userId: 'user-1',
      reason: 'gpu exploded',
    });

    expect(seen).toHaveLength(0);
  });

  it('fans out to every subscriber of the same type', async () => {
    const a: string[] = [];
    const b: string[] = [];
    await bus.subscribe(['generation.progress'], (e) => {
      a.push(e.payload.stage);
    });
    await bus.subscribe(['generation.progress'], (e) => {
      b.push(e.payload.stage);
    });

    await bus.publish('generation.progress', {
      jobId: 'job-1',
      userId: 'user-1',
      stage: 'ai_processing',
      progress: 50,
    });

    expect(a).toEqual(['ai_processing']);
    expect(b).toEqual(['ai_processing']);
  });

  it('validates payloads exactly as the Kafka bus would', async () => {
    await expect(
      // @ts-expect-error deliberately wrong payload
      bus.publish('generation.started', { jobId: 'job-1' }),
    ).rejects.toThrow(EventValidationError);
  });

  it('preserves per-job ordering across sequential publishes', async () => {
    const order: number[] = [];
    await bus.subscribe(['generation.progress'], async (e) => {
      // Deliberately slow on the first event: if dispatch were concurrent,
      // the second would overtake it.
      if (e.payload.progress === 10) {
        await new Promise((r) => setTimeout(r, 20));
      }
      order.push(e.payload.progress);
    });

    await bus.publish('generation.progress', {
      jobId: 'job-1',
      userId: 'u',
      stage: 'ai_processing',
      progress: 10,
    });
    await bus.publish('generation.progress', {
      jobId: 'job-1',
      userId: 'u',
      stage: 'ai_processing',
      progress: 20,
    });

    expect(order).toEqual([10, 20]);
  });

  it('keeps publishing when one handler throws', async () => {
    const survived: string[] = [];
    const onInvalidMessage = vi.fn();

    await bus.subscribe(
      ['generation.failed'],
      () => {
        throw new Error('handler blew up');
      },
      { onInvalidMessage },
    );
    await bus.subscribe(['generation.failed'], (e) => {
      survived.push(e.payload.reason);
    });

    await expect(
      bus.publish('generation.failed', {
        jobId: 'job-1',
        userId: 'u',
        reason: 'timeout',
      }),
    ).resolves.toBeDefined();

    expect(onInvalidMessage).toHaveBeenCalledOnce();
    expect(survived).toEqual(['timeout']);
  });

  it('stops delivering after unsubscribe', async () => {
    const seen: EventEnvelope[] = [];
    const sub = await bus.subscribe(['generation.started'], (e) => {
      seen.push(e);
    });

    await sub.unsubscribe();
    await bus.publish('generation.started', {
      jobId: 'job-1',
      userId: 'u',
      projectId: 'p',
      type: 'audio',
    });

    expect(seen).toHaveLength(0);
  });

  it('misses events published before the subscriber existed', async () => {
    // Documents a real limitation of this backend versus Kafka: there is no
    // retained log, so a late subscriber cannot catch up.
    await bus.publish('generation.started', {
      jobId: 'job-early',
      userId: 'u',
      projectId: 'p',
      type: 'video',
    });

    const seen: EventEnvelope[] = [];
    await bus.subscribe(['generation.started'], (e) => {
      seen.push(e);
    });

    expect(seen).toHaveLength(0);
    expect(bus.publishedOfType('generation.started')).toHaveLength(1);
  });

  it('reports health without claiming a Kafka connection', async () => {
    const health = await bus.health();
    expect(health.backend).toBe('memory');
    expect(health.connected).toBe(true);
    expect(health.detail).toMatch(/not connected to Kafka/);
  });
});
