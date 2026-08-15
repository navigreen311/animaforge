import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, type Dirent } from 'node:fs';
import path from 'node:path';
import {
  FEATURE_STATUS,
  explainFeature,
  getFeatureStatus,
  type FeatureKey,
} from '../../apps/web/src/app/(dashboard)/components/unavailable/featureStatus';

const keys = Object.keys(FEATURE_STATUS) as FeatureKey[];

describe('feature status registry', () => {
  it('covers every disabled control', () => {
    expect(keys.length).toBeGreaterThan(15);
  });

  it.each(keys)('%s has a usable summary and detail', (key) => {
    const status = getFeatureStatus(key);
    expect(status.summary.length).toBeGreaterThan(5);
    expect(status.detail.length).toBeGreaterThan(40);
    expect(['no-persistence', 'vendor-credential', 'not-built']).toContain(status.blocker);
  });

  it.each(keys)('%s does not fall back to "coming soon"', (key) => {
    const status = getFeatureStatus(key);
    const text = `${status.summary} ${status.detail}`.toLowerCase();
    // The whole point of this registry is to say something specific. These are
    // the phrases it exists to replace.
    for (const vague of ['coming soon', 'not yet available', 'stay tuned', 'in progress']) {
      expect(text).not.toContain(vague);
    }
  });

  it.each(keys)('%s names something concrete', (key) => {
    const { detail } = getFeatureStatus(key);
    // A route, an env var, a model, a package or a file — anything a reader can
    // go and check. A reason nobody can verify is just a nicer "coming soon".
    const concrete =
      /\/api\/[a-z[\]/-]+/.test(detail) ||
      /[A-Z][A-Z_]{4,}/.test(detail) ||
      /packages\/|apps\/|services\//.test(detail) ||
      /\b(three\.js|Stripe|Prisma|TOTP|WebGL)\b/.test(detail);
    expect(concrete, `"${detail}" names nothing checkable`).toBe(true);
  });

  it('appends the tracking issue when there is one', () => {
    const withIssue = keys.filter((k) => getFeatureStatus(k).issue !== undefined);
    expect(withIssue.length).toBeGreaterThan(0);

    for (const key of withIssue) {
      const status = getFeatureStatus(key);
      expect(explainFeature(key)).toContain(`#${status.issue}`);
    }
  });

  it('omits the issue suffix when there is none', () => {
    const without = keys.filter((k) => getFeatureStatus(k).issue === undefined);
    expect(without.length).toBeGreaterThan(0);

    for (const key of without) {
      expect(explainFeature(key)).toBe(getFeatureStatus(key).detail);
    }
  });

  it('points persistence blockers at the same tracking issue', () => {
    const persistence = keys
      .map((k) => getFeatureStatus(k))
      .filter((s) => s.blocker === 'no-persistence');

    expect(persistence.length).toBeGreaterThan(5);
    for (const status of persistence) {
      expect(status.issue).toBe(58);
    }
  });
});

/**
 * Regression guard. Every one of these controls used to raise a "coming soon"
 * toast; nothing should quietly reintroduce one.
 */
describe('no "coming soon" in shipped UI', () => {
  const roots = [
    path.resolve(__dirname, '../../apps/web/src'),
    path.resolve(__dirname, '../../apps/mobile/src'),
  ];

  function walk(dir: string): string[] {
    const out: string[] = [];
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        out.push(...walk(full));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  }

  it('has no user-facing "coming soon" string', () => {
    const offenders: string[] = [];

    for (const root of roots) {
      for (const file of walk(root)) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (!/coming soon/i.test(line)) return;
          // Comments explaining what was removed are fine; strings shown to a
          // user are not.
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            return;
          }
          offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}`);
        });
      }
    }

    expect(offenders, `"coming soon" reintroduced at:\n${offenders.join('\n')}`).toEqual([]);
  });
});
