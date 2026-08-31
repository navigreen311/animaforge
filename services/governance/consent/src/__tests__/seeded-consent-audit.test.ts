/**
 * What enforcing the consent half of `runPreCheck` would refuse, right now.
 *
 * Run against the real seeded database:
 *
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/animaforge_e2e \
 *     npx vitest run src/__tests__/seeded-consent-audit.test.ts
 *
 * Skipped when DATABASE_URL is unset, so it does not fail a CI run that has no
 * database — this is a measurement against real data, not an invariant.
 *
 * WHY MEASURE BEFORE ENFORCING
 * ============================
 *
 *     The consent half has no false-positive problem: a missing likeness consent is a
 *     fact, not a keyword match. That makes it safe to enforce in a way the safety half
 *     is not, and it does NOT make it safe to enforce without looking at what it would
 *     refuse. A control that is correct and refuses everything is still a control that
 *     stops the product.
 */

import { describe, it, expect } from 'vitest';
import { validateConsents } from '../services/consentService';
import { prisma, isDatabaseReachable } from '../db';

/** The triple `runPreCheck` hardcodes. */
const REQUIRED = ['likeness', 'voice', 'motion'];

const hasDb = Boolean(process.env.DATABASE_URL);
const maybe = hasDb ? describe : describe.skip;

maybe('Seeded consent audit — animaforge_e2e', () => {
  it('reports what enforcing would refuse', async () => {
    expect(await isDatabaseReachable()).toBe(true);
    const db = prisma!;

    const characters = await db.character.findMany({ select: { id: true, name: true } });
    const consents = await db.consent.findMany({
      select: { subjectId: true, consentType: true, revokedAt: true, expiresAt: true },
    });
    const jobs = await db.generationJob.findMany({
      select: { id: true, inputParams: true },
    });
    const shots = await db.shot.findMany({
      select: { id: true, characterRefs: true },
    });

    const log = (s: string) => console.log(s); // eslint-disable-line no-console

    log(`\n--- seeded data ---`);
    log(`characters:      ${characters.length}`);
    log(`consent records: ${consents.length}`);
    log(`generation jobs: ${jobs.length}`);
    log(`shots:           ${shots.length}`);

    // 1. What the jobs actually declare.
    const jobRefs = jobs.map((j) => {
      const p = (j.inputParams ?? {}) as Record<string, unknown>;
      return { id: j.id, refs: (p.characterRefs as string[]) ?? [] };
    });
    const jobsWithRefs = jobRefs.filter((j) => j.refs.length > 0);

    log(`\n--- what enforcing would refuse, from the 4 seeded jobs ---`);
    let refusedJobs = 0;
    for (const j of jobRefs) {
      const result = await validateConsents(j.refs, REQUIRED);
      if (!result.valid) refusedJobs++;
      log(
        `  job ${j.id.slice(0, 8)}  characterRefs=${JSON.stringify(j.refs)}  ` +
          `-> ${result.valid ? 'ALLOWED' : 'REFUSED'}`,
      );
    }
    log(`  refused: ${refusedJobs}/${jobs.length}`);
    log(`  jobs declaring any character: ${jobsWithRefs.length}/${jobs.length}`);

    // 2. The counterfactual that matters: what if refs were populated?
    log(`\n--- what WOULD be refused if character refs were populated ---`);
    let refusedChars = 0;
    for (const c of characters) {
      const result = await validateConsents([c.id], REQUIRED);
      if (!result.valid) refusedChars++;
      const missing = result.missing_consents.map((m) => m.consent_type).join(', ');
      log(
        `  ${c.name.padEnd(16)} ${result.valid ? 'ALLOWED' : 'REFUSED — missing ' + missing}`,
      );
    }
    log(`  refused: ${refusedChars}/${characters.length} characters`);

    // 3. Do the consent subjects correspond to any character at all?
    const charIds = new Set(characters.map((c) => c.id));
    const consentSubjects = new Set(consents.map((c) => c.subjectId));
    const overlap = [...consentSubjects].filter((s) => charIds.has(s));
    log(`\n--- subject-id overlap ---`);
    log(`  consent subjects: ${consentSubjects.size}`);
    log(`  of which are characters: ${overlap.length}`);

    // 4. Which consent types exist at all.
    const types = [...new Set(consents.map((c) => c.consentType))].sort();
    log(`\n--- consent types present ---`);
    log(`  granted anywhere: ${types.join(', ')}`);
    log(`  required by runPreCheck: ${REQUIRED.join(', ')}`);
    log(`  never granted: ${REQUIRED.filter((t) => !types.includes(t)).join(', ') || '(none)'}`);

    // Shots carry no refs either, which is why a job would never get any.
    const shotsWithRefs = shots.filter((s) => (s.characterRefs ?? []).length > 0);
    log(`\n--- shots declaring characters ---`);
    log(`  ${shotsWithRefs.length}/${shots.length}`);

    expect(jobs.length).toBeGreaterThan(0);
  });
});
