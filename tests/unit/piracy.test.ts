import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerContent,
  scanPlatform,
  detectWatermark,
  generateDMCA,
  getDashboard,
  getAlerts,
  clearStore,
} from '../../services/piracy/src/services/piracyService';

beforeEach(() => {
  clearStore();
});

// ---------------------------------------------------------------------------
// 1. Register content
// ---------------------------------------------------------------------------
describe('Piracy - Register Content', () => {
  it('registers content and returns an entry with id', () => {
    const content = registerContent('output-1', 'wm-1', { title: 'My Video' });
    expect(content.id).toBeDefined();
    expect(content.outputId).toBe('output-1');
    expect(content.watermarkId).toBe('wm-1');
    expect(content.registeredAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Scan platform
// ---------------------------------------------------------------------------
describe('Piracy - Scan Platform', () => {
  it('performs a scan and increments total scan count', async () => {
    await scanPlatform('my animation', 'youtube');
    await scanPlatform('my animation', 'tiktok');
    const stats = getDashboard();
    expect(stats.total_scans).toBe(2);
  });

  it('returns matches as an array with required fields', async () => {
    const result = await scanPlatform('test query', 'instagram');
    expect(Array.isArray(result.matches)).toBe(true);
    for (const match of result.matches) {
      expect(match.id).toBeDefined();
      expect(match.platform).toBe('instagram');
      expect(typeof match.confidence).toBe('number');
    }
  });

  it('reports degraded instead of fabricating matches when discovery is off', async () => {
    const result = await scanPlatform('test query', 'youtube');
    expect(result.matches).toHaveLength(0);
    expect(result.candidates_examined).toBe(0);
    expect(result.degraded).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Detect watermark
// ---------------------------------------------------------------------------
describe('Piracy - Detect Watermark', () => {
  it('reports "not checked" rather than a guess when no watermark service is configured', async () => {
    const result = await detectWatermark('https://example.com/video.mp4');
    expect(result.url).toBe('https://example.com/video.mp4');
    // null means "we could not check", which is deliberately not `false`.
    expect(result.watermark_present).toBeNull();
    expect(result.method).toBe('not-configured');
    expect(typeof result.confidence).toBe('number');
    expect(result.reason).toMatch(/WATERMARK_SERVICE_URL/);
  });
});

// ---------------------------------------------------------------------------
// 4. Generate DMCA
// ---------------------------------------------------------------------------
describe('Piracy - Generate DMCA', () => {
  it('throws for a non-existent match', () => {
    expect(() => generateDMCA('fake-match-id')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. Dashboard stats
// ---------------------------------------------------------------------------
describe('Piracy - Dashboard Stats', () => {
  it('returns aggregate stats with correct shape', async () => {
    registerContent('o1', 'w1');
    registerContent('o2', 'w2');
    await scanPlatform('query', 'twitter');

    const stats = getDashboard();
    expect(stats.total_registered).toBe(2);
    expect(stats.total_scans).toBe(1);
    expect(typeof stats.matches_found).toBe('number');
    expect(typeof stats.takedown_rate).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// 6. Clear store
// ---------------------------------------------------------------------------
describe('Piracy - Store Reset', () => {
  it('clears all data when store is reset', async () => {
    registerContent('o1', 'w1');
    await scanPlatform('q', 'yt');
    clearStore();

    const stats = getDashboard();
    expect(stats.total_registered).toBe(0);
    expect(stats.total_scans).toBe(0);
  });
});
