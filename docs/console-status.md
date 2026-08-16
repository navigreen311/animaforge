# Console status — what is disabled, and why

Every control in the dashboard that cannot do its job, with the reason as it
stands today. The machine-readable version is
`apps/web/src/app/(dashboard)/components/unavailable/featureStatus.ts`; this is
the same information with the evidence attached.

That file's doctrine governs both:

> Each `detail` is a claim about this repository that was checked before being
> written down. If one of them stops being true, the control should stop being
> disabled — not have its wording softened.

## How these were checked

Not by reading route source. A handler can call Prisma and still lose the
write, and every service in this repo falls back to an in-memory `Map` when the
database is unreachable — which answers a POST followed by a GET in the same
process exactly as a database would.

`.github/workflows/verify-persistence.yml` writes through the real API against
real Postgres, **restarts platform-api**, and then reads back. The restart is
the whole point: the `Map` is gone afterwards, so anything that comes back came
from Postgres. Run [`31925346146`](https://github.com/navigreen311/animaforge/actions/runs/31925346146)
is the evidence behind every claim below.

## Re-enabled — verified to persist

| Control | Route | Evidence |
| --- | --- | --- |
| Create sub-team | `POST /api/team/teams` | survived restart |
| Rename sub-team | `PATCH /api/team/teams/:id` | list served from Postgres |
| Invite a member | `POST /api/team/invite` | invitation survived restart |
| Add webhook endpoint | `POST /api/webhooks` | survived restart |
| Edit AI memory | `PATCH /api/users/me/memory` | survived restart |
| Upload workspace logo | `POST /api/upload/presign` | signed URL issued; asset row survived restart |
| Upload an asset | presign + `POST /api/assets` | survived restart |
| Create a style pack | `POST /api/styles` | survived restart |
| Create a project (from Script) | `POST /api/projects` | survived restart |

Ten registry entries were deleted. Nothing in the console is blocked on
persistence any more, so the `no-persistence` blocker category and
`NO_PERSISTENCE_ISSUE` were removed rather than left to be reused.

## Still disabled — and what is actually missing

### Nothing records activity — `team.activityLog`

`GET /api/v1/activity` reads the real `AuditTrail` table, so the endpoint is no
longer sample data. **Nothing writes to that table.** After creating a team, a
project and an invitation against a live database, the feed still returned
`total: 0`. The gap is a recording call on the write paths, not a missing store.

### No per-project access model — `team.projectAccess`

`Membership` is team-to-user: `teamId`, `userId`, `role`, and no project
dimension. No endpoint accepts a per-project grant. Teams themselves persist, so
this is not the persistence layer — there is nowhere to record that one member
may see one project.

### No importer — `projects.import`

Creating a project persists. What is missing is the import: nothing in this
repository parses a project archive or a screenplay into scenes and shots, and
there is no `/api/projects/import` route to send a file to.

### Not wired here — `voice.uploadSample`

Persistence is not the blocker: `POST /api/v1/voices` survives a restart. The
control lives in `components/shared/VoiceSelectorModal.tsx`, outside the paths
this change owns, so it is labelled honestly rather than re-enabled blind.

### Needs a credential — 8 entries

`auth.passwordChange`, `auth.twoFactor`, `billing.upgrade`,
`billing.comparePlans`, `billing.updateCard`, `billing.mobilePurchase`,
`analytics.connectPlatform`, `team.transferOwnership`. These need an identity
provider, Stripe keys, or a platform OAuth app that this repository does not
have. `team.transferOwnership` also carried a stale "membership is not
persisted" clause, which was removed — the record does persist; the step-up
authentication is what is missing.

### Not built — 2 entries

`assets.preview3d`, `nav.unbuiltRoute`.

## Hardcoded data still on screen

Arrays that are not configuration and have no model behind them. They are
commented in place, naming what is missing, rather than being wired to an
invented table:

| Page | Array | Missing |
| --- | --- | --- |
| assets | `STORAGE` | `Asset` has no size column; no route aggregates usage |
| audio | `VOICE_ENTRIES` | no model for a recorded take, only for available voices |
| audio | `SFX_LIBRARY` | no sound-effects library in the schema or API |
| script | `INITIAL_SCENES` / `INITIAL_SHOTS` / `INITIAL_CHARACTERS` | no route persists a draft script back |
| team | `TOTAL_SEATS` / `MONTHLY_CREDITS` | `Subscription` has no seat or credit columns |

## Deploy workflows

`Deploy to Production` and `Deploy to Staging` are dispatch-only. They were
disabled deliberately in commit `9777fe3` on 2026-08-15 (PR #81), not broken
silently. Re-verified 2026-08-16 — all three blockers hold:

1. `gh secret list` returns nothing; no `PRODUCTION_*` or `STAGING_*` secrets.
2. `k8s/` has no `overlays/` directory, which is what `kubectl apply -k`
   targets.
3. `services/{export,notification,search,analytics}` have no `Dockerfile`.

The re-enable bar is now written into the workflow files themselves.

## Fact Check List

1. **The evidence is one run against one database.** Run `31925346146`, on a
   throwaway Postgres created by the workflow. It shows these routes persist on
   a correctly migrated database; it says nothing about a production deployment
   whose schema has drifted.
2. **The probes authenticate through the bug in #82.** platform-api's
   `requireAuth` base64-decodes the JWT payload and trusts it without verifying
   a signature. The harness mints such a token. When that is fixed, the workflow
   must mint a properly signed one or every probe will 401 — and the workflow
   will report failures that are about the harness, not the routes.
3. **Persistence was verified at the API layer, then re-checked through the UI
   after rebasing.** If the auth fix changes the token the browser sends, the
   proxy routes could 401 even though platform-api persists correctly.
4. **`assets.upload` and `settings.logoUpload` were verified as far as the
   presign and the asset record.** The `PUT` to storage was not exercised —
   there is no S3 bucket here — so an upload can still fail at the storage step.
   The UI reports that step separately rather than claiming success.
5. **"Config" is a judgement call.** Arrays like `EMOTIONS`, `EXPORT_FORMATS`
   and `HAIR_STYLES` were left alone as option lists. If any of them is meant to
   be user-editable, it belongs in a table and this triage got it wrong.
6. **`team.activityLog` is judged on an absence.** The probe asserts the feed is
   empty after real writes. If some other code path does write `AuditTrail` on a
   trigger the probe never fired, the entry understates what works.
7. **The restart test proves durability, not correctness.** A route could
   persist the wrong thing and still pass. These probes check that a value
   written comes back, not that it is stored under the right owner or shape.
