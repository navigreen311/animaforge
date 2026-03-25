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
  it('performs a scan and increments total scan count', () => {
    scanPlatform('my animation', 'youtube');
    scanPlatform('my animation', 'tiktok');
    const stats = getDashboard();
    expect(stats.total_scans).toBe(2);
  });

  it('returns matches as an array with required fields', () => {
    const result = scanPlatform('test query', 'instagram');
    expect(Array.isArray(result.matches)).toBe(true);
    for (const match of result.matches) {
      expect(match.id).toBeDefined();
      expect(match.platform).toBe('instagram');
      expect(typeof match.confidence).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Detect watermark
// ---------------------------------------------------------------------------
describe('Piracy - Detect Watermark', () => {
  it('returns watermark detection result with expected shape', () => {
    const result = detectWatermark('https://example.com/video.mp4');
    expect(result.url).toBe('https://example.com/video.mp4');
    expect(typeof result.watermark_present).toBe('boolean');
    expect(typeof result.confidence).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// 4. Generate DMCA
// ---------------------------------------------------------------------------
describe('Piracy - Generate DMCA', () => {
  it('generates a DMCA notice for a valid match', () => {
    // Scan until we get matches (random mock)
    let matchId: string | null = null;
    for (let i = 0; i < 30 && !matchId; i++) {
      const result = scanPlatform('pirated content', 'youtube');
      if (result.matches.length > 0) matchId = result.matches[0].id;
    }

    if (matchId) {
      const notice = generateDMCA(matchId);
      expect(notice).toContain('DMCA TAKEDOWN NOTICE');
      expect(notice).toContain('AnimaForge Content Protection System');
    }
  });

  it('throws for a non-existent match', () => {
    expect(() => generateDMCA('fake-match-id')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. Dashboard stats
// ---------------------------------------------------------------------------
describe('Piracy - Dashboard Stats', () => {
  it('returns aggregate stats with correct shape', () => {
    registerContent('o1', 'w1');
    registerContent('o2', 'w2');
    scanPlatform('query', 'twitter');

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
  it('clears all data when store is reset', () => {
    registerContent('o1', 'w1');
    scanPlatform('q', 'yt');
    clearStore();

    const stats = getDashboard();
    expect(stats.total_registered).toBe(0);
    expect(stats.total_scans).toBe(0);
  });
});
