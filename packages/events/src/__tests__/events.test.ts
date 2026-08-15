import { describe, it, expect } from 'vitest';
import {
  ALL_EVENT_TYPES,
  EventValidationError,
  eventTypesForTopic,
  isEventType,
  parseEnvelope,
  parsePayload,
  partitionKeyFor,
  topicFor,
} from '../events';
import { createEnvelope } from '../bus';
import { TOPICS } from '../topics';

describe('event registry', () => {
  it('routes every event type to a known topic', () => {
    const known = new Set<string>(Object.values(TOPICS));
    for (const type of ALL_EVENT_TYPES) {
      expect(known.has(topicFor(type))).toBe(true);
    }
  });

  it('partitions generation and governance onto separate topics', () => {
    expect(topicFor('generation.started')).toBe(TOPICS.GENERATION);
    expect(topicFor('governance.completed')).toBe(TOPICS.GOVERNANCE);
  });

  it('lists the event types carried by each topic', () => {
    const generation = eventTypesForTopic(TOPICS.GENERATION);
    expect(generation).toContain('generation.started');
    expect(generation).not.toContain('governance.completed');
  });

  it('recognises only registered types', () => {
    expect(isEventType('generation.started')).toBe(true);
    expect(isEventType('generation.definitely_not_real')).toBe(false);
  });
});

describe('payload validation', () => {
  it('applies schema defaults', () => {
    const payload = parsePayload('generation.completed', {
      jobId: 'job-1',
      userId: 'user-1',
      outputUrl: 'https://cdn.example/out.mp4',
    });
    // `deduplicated` defaults to false rather than arriving undefined.
    expect(payload.deduplicated).toBe(false);
  });

  it('rejects a payload missing a required field', () => {
    expect(() => parsePayload('generation.started', { jobId: 'job-1' })).toThrow(
      EventValidationError,
    );
  });

  it('rejects an out-of-range progress value', () => {
    expect(() =>
      parsePayload('generation.progress', {
        jobId: 'job-1',
        userId: 'user-1',
        stage: 'ai_processing',
        progress: 140,
      }),
    ).toThrow(EventValidationError);
  });

  it('rejects a governance stage outside the pipeline vocabulary', () => {
    expect(() =>
      parsePayload('governance.stage_changed', {
        jobId: 'job-1',
        stage: 'vibe_check',
        status: 'running',
      }),
    ).toThrow(EventValidationError);
  });

  it('accepts every real governance stage and status', () => {
    const stages = [
      'content_moderation',
      'consent_validation',
      'c2pa_signing',
      'watermarking',
    ] as const;
    const statuses = ['running', 'passed', 'blocked', 'alert', 'manual_review'] as const;

    for (const stage of stages) {
      for (const status of statuses) {
        expect(() =>
          parsePayload('governance.stage_changed', {
            jobId: 'job-1',
            stage,
            status,
          }),
        ).not.toThrow();
      }
    }
  });
});

describe('envelope', () => {
  it('stamps id, version, timestamp and source', () => {
    const envelope = createEnvelope(
      'generation.started',
      {
        jobId: 'job-1',
        userId: 'user-1',
        projectId: 'proj-1',
        type: 'video',
      },
      'workers',
    );

    expect(envelope.id).toMatch(/[0-9a-f-]{36}/);
    expect(envelope.type).toBe('generation.started');
    expect(envelope.version).toBe(1);
    expect(envelope.source).toBe('workers');
    expect(Number.isNaN(Date.parse(envelope.occurredAt))).toBe(false);
  });

  it('defaults correlationId to the job id so a job stays on one partition', () => {
    const envelope = createEnvelope(
      'generation.progress',
      { jobId: 'job-42', userId: 'user-1', stage: 'ai_processing', progress: 10 },
      'workers',
    );
    expect(envelope.correlationId).toBe('job-42');
    expect(partitionKeyFor(envelope)).toBe('job-42');
  });

  it('honours an explicit correlationId', () => {
    const envelope = createEnvelope(
      'generation.progress',
      { jobId: 'job-42', userId: 'user-1', stage: 'ai_processing', progress: 10 },
      'workers',
      { correlationId: 'trace-9' },
    );
    expect(envelope.correlationId).toBe('trace-9');
  });

  it('round-trips through JSON', () => {
    const envelope = createEnvelope(
      'governance.completed',
      {
        jobId: 'job-1',
        passed: true,
        watermarkId: 'wm-1',
      },
      'workers',
    );

    const parsed = parseEnvelope(JSON.parse(JSON.stringify(envelope)));
    expect(parsed).toEqual(envelope);
  });

  it('rejects an unknown event type off the wire', () => {
    expect(() =>
      parseEnvelope({
        id: 'e1',
        type: 'generation.teleported',
        version: 1,
        occurredAt: new Date().toISOString(),
        source: 'workers',
        payload: {},
      }),
    ).toThrow(/Unknown event type/);
  });

  it('rejects a known type carrying a bad payload', () => {
    expect(() =>
      parseEnvelope({
        id: 'e1',
        type: 'generation.started',
        version: 1,
        occurredAt: new Date().toISOString(),
        source: 'workers',
        payload: { jobId: 'job-1', userId: 'u', projectId: 'p', type: 'hologram' },
      }),
    ).toThrow(/Invalid payload/);
  });

  it('rejects a structurally malformed envelope', () => {
    expect(() => parseEnvelope({ nope: true })).toThrow(/Malformed event envelope/);
  });
});
