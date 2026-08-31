/**
 * What `runPreCheck` would refuse, measured against the corpus that exists.
 *
 * WHY THIS FILE EXISTS, AND WHAT IT IS NOT
 * ========================================
 *
 *     `runPreCheck` has never run in production. It is wired into no live path, and
 *     the request was to report what it would refuse from thirty days of real traffic
 *     before switching it on.
 *
 *     **There is no such traffic.** No AnimaForge production database exists. The only
 *     generation jobs anywhere are four end-to-end fixtures from 2026-08-15, every one
 *     of them still `queued`, every one carrying the prompt "e2e queued job". There are
 *     no moderation logs, because nothing has ever called the moderation service.
 *
 *     So this measures two things instead, and neither is the thing that was asked for:
 *
 *       CORPUS A  the seeded shot prompts — 12 real, domain-representative prompts
 *                 written by whoever seeded this repository. Small, and genuine.
 *
 *       CORPUS B  standard cinematography and production vocabulary. NOT traffic. It
 *                 is a structural probe: a filter that collides with the working
 *                 vocabulary of the domain it polices will produce false positives at
 *                 whatever rate that vocabulary appears, and that rate is high.
 *
 *     Corpus B is the more useful of the two, and it is a claim about the classifier
 *     rather than a claim about traffic. Read the numbers accordingly.
 *
 * WHAT THE CLASSIFIER ACTUALLY DOES
 * =================================
 *
 *     `preCheck` blocks on ANY single keyword hit — `hits.length > 0` — with no
 *     threshold and no score. And the match is `lower.includes(kw)`: a raw substring,
 *     with no word boundaries.
 *
 *     Those two facts compose badly. One substring of one keyword appearing anywhere in
 *     a prompt refuses the whole generation.
 */

import { describe, it, expect } from 'vitest';
import { preCheck } from '../services/moderationService';

/* ------------------------------------------------------------------ corpora */

/**
 * CORPUS A — the seeded shot prompts, verbatim from `packages/db/src/seeds/seed.ts`
 * and the `shots` table of `animaforge_e2e`. Three projects: a hard-SF short, a
 * children's fantasy, and a cyberpunk music video.
 */
const CORPUS_A_SEEDED_PROMPTS = [
  'Commander Shaw steps onto the ice plain of Europa, helmet visor reflecting distant Jupiter.',
  'Shaw and Dr. Lin discuss the anomalous signal in the station corridor.',
  'Wide shot of the alien artifact pulsing with bioluminescent light beneath the ice.',
  'Close-up of Dr. Lin reaching toward the artifact, hand trembling.',
  'Rosie the Fox peers through the mossy archway into the Whispering Woods.',
  'Rosie meets the Oak Guardian, who blocks the forest path with tangled roots.',
  'The Riddle Gate materializes from swirling fog — ancient runes glow on its stone face.',
  'Close-up: Rosie solves the riddle, runes rearranging into a doorway.',
  'Aerial shot descending into the Neon District, holographic ads flickering in the rain.',
  'Kira drops into the underground arena, synth beat synced to her movement.',
  'Sky Rail chase sequence — Kira grinds along a rail above the city, rival in pursuit.',
  'Final frame: Kira stands on a rooftop as sunrise bleaches the neon skyline.',
];

/**
 * CORPUS B — ordinary production language. Every line is something a director,
 * editor or marketer would plausibly type into a video tool, and none of it describes
 * violent, sexual, impersonating or child-endangering content.
 *
 * Chosen to probe the substring behaviour rather than to be representative of volume.
 */
const CORPUS_B_PRODUCTION_VOCABULARY = [
  'Establishing shot of the harbour at dawn.',
  'We shoot the interview against a plain grey backdrop.',
  'Re-shoot the second half with a longer lens.',
  'Photoshoot stills, colour graded to match the film.',
  'Apply stabilization to the handheld footage.',
  'The stabilizer pass removes the camera shake.',
  'Establish the geography of the room before the dialogue.',
  'A skilled craftsperson shapes the clay on a wheel.',
  'Her skill with the violin carries the whole scene.',
  'The killer feature of the product, shown in one gesture.',
  'Bloodhound tracking through the meadow, nose to the ground.',
  'Cold-blooded reptiles basking on warm stone.',
  'The exploded view of the engine rotates slowly.',
  'Explicitly label each part as it appears.',
  'A minor adjustment to the lighting between takes.',
  'The gorge opens onto a valley of wildflowers.',
  'Weaponise nothing; this is a gardening tutorial.',
  'Shoot wide, then punch in for the reaction.',
];

/** A control set: content the filter SHOULD refuse. */
const CORPUS_C_TRUE_POSITIVES = [
  'A graphic depiction of a man being stabbed in an alley, blood pooling.',
  'Generate a nude figure in an explicit pose.',
  'Deepfake the CEO so it looks like he said this.',
  'Depict an underage character in a sexual situation.',
];

/* ------------------------------------------------------------------ helpers */

async function classify(prompt: string) {
  return preCheck({ prompt, scene_graph: undefined } as Parameters<typeof preCheck>[0]);
}

async function refusalRate(corpus: string[]) {
  const results = await Promise.all(
    corpus.map(async (p) => ({ prompt: p, ...(await classify(p)) })),
  );
  const refused = results.filter((r) => !r.allowed);
  return { results, refused, rate: refused.length / corpus.length };
}

/* -------------------------------------------------------------------- tests */

describe('CORPUS A — the seeded prompts (12, real, small)', () => {
  it('reports the refusal rate', async () => {
    const { refused, rate, results } = await refusalRate(CORPUS_A_SEEDED_PROMPTS);

    // eslint-disable-next-line no-console
    console.log(
      `\nCORPUS A: ${refused.length}/${CORPUS_A_SEEDED_PROMPTS.length} refused ` +
        `(${(rate * 100).toFixed(0)}%)`,
    );
    for (const r of results.filter((x) => !x.allowed)) {
      // eslint-disable-next-line no-console
      console.log(`  REFUSED  ${r.reason_code}\n           "${r.prompt}"`);
    }

    // No assertion on the rate itself — this test exists to report a number, and
    // pinning it would turn a measurement into a requirement.
    expect(results).toHaveLength(CORPUS_A_SEEDED_PROMPTS.length);
  });
});

describe('CORPUS B — ordinary production vocabulary (18, not traffic)', () => {
  it('reports the refusal rate', async () => {
    const { refused, rate, results } = await refusalRate(CORPUS_B_PRODUCTION_VOCABULARY);

    // eslint-disable-next-line no-console
    console.log(
      `\nCORPUS B: ${refused.length}/${CORPUS_B_PRODUCTION_VOCABULARY.length} refused ` +
        `(${(rate * 100).toFixed(0)}%)`,
    );
    for (const r of results.filter((x) => !x.allowed)) {
      // eslint-disable-next-line no-console
      console.log(`  REFUSED  ${r.reason_code}\n           "${r.prompt}"`);
    }

    expect(results).toHaveLength(CORPUS_B_PRODUCTION_VOCABULARY.length);
  });
});

describe('CORPUS C — content the filter should refuse (control)', () => {
  it('refuses all four', async () => {
    const { refused } = await refusalRate(CORPUS_C_TRUE_POSITIVES);
    expect(refused).toHaveLength(CORPUS_C_TRUE_POSITIVES.length);
  });
});

describe('The collisions that word boundaries fixed (regression)', () => {
  // These four asserted the OLD behaviour: each was REFUSED because the classifier
  // matched inside words. They are kept, inverted, because a regression here is
  // invisible — the filter would simply start refusing ordinary work again.

  it('"establishing shot" passes — `establishing` contains `stab`', async () => {
    const r = await classify('Establishing shot of the harbour at dawn.');
    expect(r.allowed).toBe(true);
  });

  it('"stabilization" passes — AnimaForge ships a Stabilizer service', async () => {
    const r = await classify('Apply stabilization to the handheld footage.');
    expect(r.allowed).toBe(true);
  });

  it('"skilled" passes — it contains `kill`', async () => {
    const r = await classify('A skilled craftsperson shapes the clay on a wheel.');
    expect(r.allowed).toBe(true);
  });

  it('"photoshoot" passes as one word, while bare "shoot" still refuses', async () => {
    // The boundary fix stops the substring match. It does NOT remove `shoot` from the
    // violence list, and that is a keyword-list decision rather than a matching one.
    expect((await classify('Photoshoot stills, colour graded.')).allowed).toBe(true);
    expect((await classify('Shoot wide, then punch in.')).allowed).toBe(false);
  });

  it.each([
    'Bloodhound tracking through the meadow, nose to the ground.',
    'Cold-blooded reptiles basking on warm stone.',
    'The exploded view of the engine rotates slowly.',
    'Explicitly label each part as it appears.',
    'Weaponise nothing; this is a gardening tutorial.',
    'Her skill with the violin carries the whole scene.',
    'The killer feature of the product, shown in one gesture.',
  ])('passes: %j', async (prompt) => {
    expect((await classify(prompt)).allowed).toBe(true);
  });

  it('still blocks the whole prompt on one real hit — there is no threshold', async () => {
    // Unchanged by this fix, and worth keeping visible: `preCheck` has no BLOCK or
    // FLAG threshold, unlike `moderate`. One genuine keyword refuses the generation.
    expect((await classify('A calm shot of a lake at sunrise.')).allowed).toBe(true);

    const oneWord = await classify('A calm lake at sunrise, then we shoot the reaction.');
    expect(oneWord.allowed).toBe(false);
    expect(oneWord.blocked_categories).toEqual(['violence']);
  });

  it('still catches a phrase keyword, which a token test would miss', async () => {
    const r = await classify('Make it look like the CEO said this — clone voice from the clip.');
    expect(r.allowed).toBe(false);
    expect(r.reason_code).toContain('clone voice');
  });
});
