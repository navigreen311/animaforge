# Web Persistence Architecture

How `apps/web` talks to the database, and why it does it that way.

Written before the implementation, as the decision record for issue #58. If you
are adding a route, the rule you need is in [§3](#3-the-rule).

---

## 1. What was measured

On `main` at `2ab45dc`:

| Measurement                                   | Value   |
| --------------------------------------------- | ------- |
| `route.ts` files under `apps/web/src/app/api` | **128** |
| ...that import Prisma or `@animaforge/db`     | **0**   |
| ...that make any outbound `fetch()`           | **0**   |
| ...that contain a literal `MOCK_` constant    | **46**  |
| Dashboard `page.tsx` files                    | **46**  |
| ...that fetch anything at all                 | **4**   |
| `services/platform-api` route modules         | **20**  |
| ...actually mounted in `src/index.ts`         | **13**  |

Nothing a user does in the console survives a refresh. The canonical example is
`api/team/teams/route.ts`: `POST` builds `{ id: \`team\_${Date.now()}\`, ... }`,
returns it with `success: true`, and stores nothing; `GET` returns two frozen
teams that no write can ever change.

Two facts shape the decision. First, **`services/platform-api` is already a real
Prisma backend** with request validation, an error contract, and a test suite —
it is not a stub. Second, **seven of its twenty route modules are never
mounted** (`brandKit`, `humanReview`, `plugins`, `receipts`, `reproducibility`,
`reviews`, `worldBible`), so even the backend that exists is partly unreachable.

---

## 2. The decision

**Default: every `apps/web` API route is a thin proxy to `services/platform-api`.
Where platform-api lacks the endpoint, the endpoint is added to platform-api.
Next route handlers do not talk to Prisma.**

The deciding argument is **one writer per table**. `platform-api` already owns
`projects`, `scenes`, `shots`, `characters` and `assets`, and it enforces rules
that are not visible from the outside: soft-delete on projects, the style-lock
and approval checks on shots, the ordering invariant on scenes. If the Next
routes also wrote those tables, every one of those rules would exist in two
places written by two people at two times, and they would drift — silently,
because nothing compares them. The failure mode is not a crash; it is a shot
that the API refuses to edit and the console happily edits anyway. Adding a
second writer is the specific decision that would make this codebase
unmaintainable, and it is cheap to avoid now and expensive to undo later.

The runner-up was **Prisma directly in the Next route handlers**, and it is
genuinely tempting: `apps/web` already depends on `@animaforge/db`, route
handlers are server-side, and it removes a network hop and a serialisation. It
was rejected for three reasons beyond the duplication above. The console is not
the only client — `apps/mobile` and the public `/api/v1` surface need the same
logic, and logic in a Next route handler is reachable by neither. `platform-api`
has a test suite that these rules can be tested through; the Next routes have
none, so moving logic into them moves it out from under test. And Prisma in
serverless Next route handlers has a well-known connection-pool problem that
becomes someone's incident rather than someone's design decision. The cost of
proxying is real and is paid in this PR: roughly a hundred endpoints have to be
added to platform-api rather than improvised in `apps/web`. That cost buys a
single place where a business rule lives.

---

## 3. The rule

Every route falls into exactly one of three categories. **Pick by asking whether
the route touches domain data**, not by how convenient it would be.

### (a) Proxy — the default

The route touches domain data: anything persisted, owned, or scoped to a user,
project, or organisation.

```ts
// apps/web/src/app/api/<resource>/route.ts
import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/<resource>');
export const POST = proxy('POST', '/api/v1/<resource>');
```

The web route adds exactly three things and nothing else:

1. **Session → identity.** It resolves the caller and forwards them; the browser
   never sends a platform-api credential.
2. **Shape adaptation.** platform-api answers `{ success, data }`; some console
   pages expect a bare object or a named collection. The adapter lives here.
3. **Error translation.** A platform-api error becomes an HTTP status and a
   stable error code, never a 200 with an empty body.

It must not contain a conditional on domain state, a default value for a domain
field, or a computed business result. If you are writing an `if` about the data
rather than about the transport, it belongs in platform-api.

### (b) Prisma-direct — not used

**No route in `apps/web` may import Prisma.** This is a rule, not a preference,
and it is the one that keeps (a) honest. There is no "just this one read" carve
out: a read today is the join that becomes a write next quarter. If a page needs
data no endpoint exposes, add the endpoint.

### (c) Static — no persistence, and it must not pretend otherwise

A small set of routes serve genuinely constant data and have no backing model:
the API index, the docs index, the changelog, the region list, the health probe.
These stay as they are. They are legitimate because **they make no persistence
claim** — they have no `POST`, and their `GET` is honest about being a constant.

A route may only be category (c) if it has no write method. A route with a
`POST` that returns a fabricated object is not category (c); it is a bug.

### The honesty rule that overrides all three

A route that cannot persist yet returns a real error — `501` with a code and a
message naming what is missing. It never returns `{ success: true }` over a
discarded write. A missing capability that reports itself is a task; a missing
capability that fabricates success is a lie that a user discovers after losing
work.

---

## 4. Route classification

All 128 routes. Counts are route files, not HTTP methods.

### (c) Static — 6 routes

No backing model, no write method, no change needed.

| Route             | Serves                                                                          |
| ----------------- | ------------------------------------------------------------------------------- |
| `health`          | process liveness                                                                |
| `v1`              | API index                                                                       |
| `v1/changelog`    | changelog entries                                                               |
| `docs`            | docs index                                                                      |
| `regions`         | deployment region list                                                          |
| `webhooks/stripe` | Stripe's inbound webhook (writes via platform-api billing, not a console route) |

### (a) Proxy — 122 routes

Grouped by the platform-api module that owns them. **New** marks an endpoint
that does not exist in platform-api yet and is added by this work.

| Domain         | Routes | Owning model                                                                              | platform-api                   |
| -------------- | ------ | ----------------------------------------------------------------------------------------- | ------------------------------ |
| activity       | 1      | `AuditTrail`                                                                              | New                            |
| analytics      | 5      | derived: `GenerationJob`, `UsageMeter`, `Project`                                         | New                            |
| api-keys       | 3      | `ApiKey`                                                                                  | New                            |
| assets         | 12     | `Asset`, **`AssetFolder`**                                                                | `assets.ts` (extend)           |
| audio          | 9      | `AudioTrack`                                                                              | New                            |
| avatars        | 4      | **`Avatar`**                                                                              | New                            |
| billing        | 4      | `Subscription`, `Receipt`                                                                 | `receipts.ts` (mount + extend) |
| brand-kits     | 8      | **`BrandKit`**                                                                            | `brandKit.ts` (mount + extend) |
| calendar       | 4      | `CalendarEvent`, `TaskDependency`                                                         | New                            |
| characters     | 5      | `Character`                                                                               | `characters.ts` (extend)       |
| custom-domains | 2      | **`CustomDomain`**                                                                        | New                            |
| jobs           | 3      | `GenerationJob`                                                                           | New                            |
| live           | 3      | `LiveSession`, `BranchingScene`                                                           | New                            |
| markers        | 2      | **`Marker`**                                                                              | New                            |
| marketplace    | 10     | `MarketplaceItem`, **`MarketplacePurchase`**, **`MarketplaceReview`**, **`WishlistItem`** | New                            |
| piracy         | 4      | `PiracyMatch`, `DMCANotice`                                                               | New                            |
| projects       | 3      | `Project`                                                                                 | `projects.ts`                  |
| scripts        | 5      | **`Script`**                                                                              | New                            |
| shots          | 3      | `Shot`, **`ShotTake`**                                                                    | `shots.ts` (extend)            |
| styles         | 7      | `StylePack`                                                                               | New                            |
| team           | 12     | `Team`, `Membership`, `UserPresence`, **`TeamInvitation`**                                | New                            |
| upload         | 2      | `Asset` + object storage                                                                  | `upload.ts`                    |
| users/me       | 6      | `User`, `Notification`, **`UserSession`**                                                 | New                            |
| voices         | 1      | **`Voice`**                                                                               | New                            |
| webhooks       | 3      | **`WebhookEndpoint`**, `WebhookDelivery`                                                  | New                            |
| workspace      | 1      | `Organization`                                                                            | New                            |

### (b) Prisma-direct — 0 routes

By rule.

---

## 4a. What actually shipped

The classification above is the target. This is the measured result.

|                                                            | Count          |
| ---------------------------------------------------------- | -------------- |
| Routes proxying to platform-api and persisting             | **89**         |
| Routes with at least one `501` naming a missing dependency | **44**         |
| Static routes                                              | **6**          |
| **Total**                                                  | **139**        |
| Routes containing a `MOCK_` constant                       | **0** (was 46) |
| Routes importing Prisma                                    | **0**          |

The 44 are not unfinished proxies — each names a dependency this change does
not own:

| Reason                                                               | Routes |
| -------------------------------------------------------------------- | ------ |
| Needs `services/ai-api` (generation, style transfer, script writing) | 13     |
| Needs object storage (upload, download, export)                      | 14     |
| Needs an endpoint that does not exist yet                            | 13     |
| Needs Stripe credentials                                             | 2      |
| Has no backing model, and one was not invented                       | 2      |

The two with no backing model are `assets/tags` and `api-keys/usage`: asset
tagging and per-key usage counters are not modelled, and adding a table for
them was out of scope for this change.

### Dashboard pages

**34 of 46 dashboard pages read live data.** Twelve do not, and each is listed
below with the reason — none of them is a page that still displays fabricated
records as if they were real.

| Page                           | Why it does not fetch                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `developers`                   | API reference prose. Endpoint paths and example payloads are documentation, not data.                                                                      |
| `help`                         | Help articles. Same.                                                                                                                                       |
| `changelog`                    | Release notes. Same.                                                                                                                                       |
| `a11y-test`                    | A development harness for contrast and focus checks.                                                                                                       |
| `settings/region`              | Lists the CDN regions the client can reach and measures real latency to each. The region list is configuration in `lib/region/regions`, not a table.       |
| `live/overlays`                | The designer keeps overlay layers in component state. Nothing in the schema stores an overlay, so the saved-sets list says so.                             |
| `piracy/settings`              | Scan frequency, platform selection, match threshold, DMCA template and allowlist have no table. The save button reports that rather than flashing "Saved". |
| `projects/[id]/characters`     | Fetches through the `useCharacters` store hook rather than `useResource`.                                                                                  |
| `projects/[id]/shots/[shotId]` | Camera-angle and movement option lists are UI vocabulary.                                                                                                  |
| `marketplace/creator/[id]`     | Reads listings via `useResource`; counted here only because the fetch lives in a `useMemo` over the resource.                                              |
| `piracy/match/[id]`            | Same — reads the match through `useResource`.                                                                                                              |
| `projects/[id]/brand`          | Loads and saves the brand kit through the proxy routes.                                                                                                    |

The three at the bottom of that table do fetch; they are listed for
completeness because an automated grep for `useResource` in the page body
alone would miss them.

#### What was removed rather than re-pointed

Where a panel displayed something the schema cannot express, the panel was
removed or emptied and the reason written into the page, instead of being
re-pointed at an approximation:

| Panel                                         | What it claimed                                                                                                   | Why it is gone                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Analytics credit forecast                     | 5,800 credits left, 140/day, a depletion date                                                                     | `usage_meters` records credits _spent_ per period. There is no balance to run down.                                       |
| Analytics burn chart                          | A balance draining from 10,000 with a 15-day projection                                                           | Same. It now charts cumulative real spend.                                                                                |
| Analytics trend arrows                        | `+12.5%` per stat card                                                                                            | Nothing records a previous period to compare against.                                                                     |
| Analytics retry success rate                  | 25%–92% per failure reason                                                                                        | A retry creates a new job with no link to the one it replaced.                                                            |
| Calendar Gantt view                           | Tasks with phases and dependencies                                                                                | No task table.                                                                                                            |
| Calendar team workload                        | 40–90% load per member                                                                                            | Nothing records assigned hours or capacity.                                                                               |
| Milestone burndown                            | 25 tasks over 30 days with a sine-wave actual line                                                                | No task count, no per-day completion, no baseline.                                                                        |
| Milestone history / blockers / actions        | Planned-vs-actual deltas, two blockers, three action items                                                        | None of the three has a table.                                                                                            |
| Dependency graph                              | Ten named tasks and a critical path                                                                               | `task_dependencies` has edges but there is no task table, so no nodes and no durations.                                   |
| Character drift chart and history             | Eight dated drift readings, three shots with consistency scores                                                   | Nothing measures character consistency, and shots do not link back to characters.                                         |
| Export QC report                              | Seven checks, all passing                                                                                         | Nothing probes the encoded output.                                                                                        |
| Live chat panel                               | Five viewers greeting a stream that is not running                                                                | `live_chat_messages` is keyed by a session that does not exist until you go live.                                         |
| Live destinations                             | Twitch and YouTube marked connected                                                                               | No stream key or OAuth token is stored for either.                                                                        |
| Style reference search                        | The same three results for any query                                                                              | Nothing indexes styles by description.                                                                                    |
| Marketplace creator profile                   | Per-creator bios, join dates, verified badges                                                                     | There is no creator table; `marketplace_items` carries a creator id and nothing else.                                     |
| Piracy match detail                           | An uploader handle, view count, upload date, separate audio and visual scores, a four-step investigation timeline | A `piracy_matches` row records what matched, where, how strongly, by which method, and whether a watermark was recovered. |
| Project access (project settings, team modal) | Named collaborators with per-project roles                                                                        | A project has an owner and an optional org. There is no project-member table.                                             |
| Project folders                               | Animations / Ads / Shorts                                                                                         | No folders table and no folder column.                                                                                    |

#### Saves that reported success without writing

Four were found and fixed. Each now writes through a proxy route and reports
what it actually stored:

- **Project settings → Save changes** wrote nothing. It now PATCHes title and
  description, and says outright that type, aspect ratio, duration and
  thumbnail have no column.
- **Project settings → Save world bible** wrote nothing. It now PUTs to
  `/projects/[id]/world-bible`.
- **Brand kit → Save** POSTed to `/api/v1/...` on the web origin — a path with
  no route behind it — inside a `catch {}` that swallowed the 404.
- **Settings → Save profile** slept 600ms and reported "Profile saved".

Three more actions now report their true status instead of a fake success: the
asset rename (mutated a module-level array in place), the asset→shot link (no
join table), and the piracy settings save (no table).

---

## 5. Schema additions

Fourteen models the routes need and the schema does not have, in one migration.
Each is added because a route already claims to manage it, not speculatively.

| Model                 | Why                                                                   | Claimed by                                    |
| --------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `AssetFolder`         | assets are foldered in the UI with no folder table                    | `assets/folders*`                             |
| `Avatar`              | avatar CRUD + voice pairing                                           | `avatars*`                                    |
| `BrandKit`            | `Project.brandKit` is per-project JSON; the console has reusable kits | `brand-kits*`                                 |
| `CustomDomain`        | domain list with verification state                                   | `custom-domains*`                             |
| `Marker`              | timeline markers                                                      | `markers*`                                    |
| `MarketplacePurchase` | purchase + library membership                                         | `marketplace/purchase`, `marketplace/library` |
| `MarketplaceReview`   | item reviews                                                          | `marketplace/items/[id]/reviews`              |
| `Script`              | script CRUD, export, push-to-timeline                                 | `scripts*`                                    |
| `ShotTake`            | takes per shot                                                        | `shots/[id]/takes*`                           |
| `TeamInvitation`      | pending invitations, resend, revoke                                   | `team/invitations*`, `team/invite`            |
| `UserSession`         | active session list + revoke                                          | `users/me/sessions*`                          |
| `Voice`               | voice catalogue                                                       | `voices`, `avatars/[id]/pair-voice`           |
| `WebhookEndpoint`     | endpoint config (`WebhookDelivery` records attempts, not config)      | `webhooks*`                                   |
| `WishlistItem`        | marketplace wishlist                                                  | `marketplace/wishlist*`                       |

The migration history was squashed to a verified baseline in #71 and stays
linear: this adds exactly one migration on top of
`20260816000100_relabel_legacy_provenance_rows`.

---

## 6. Contracts

### platform-api

Unchanged, and now applied consistently: `{ success: true, data }` /
`{ success: false, error: { code, message } }` from `utils/apiResponse.ts`.
Fixing the routes that did not follow it is what closes the response-shape half
of #21.

### apps/web

Route handlers return the resource shape the console pages consume, and on
failure:

```json
{ "error": { "code": "UPSTREAM_UNAVAILABLE", "message": "..." } }
```

with a real status. Status mapping: platform-api status passes through; a
transport failure is `502`; an unimplemented capability is `501`.

### Pages

Every page wired to real data renders three states explicitly — loading, error,
empty. A page that silently renders an empty list when the request failed is the
same lie as a route that fabricates success.

---

## 7. What this does not do

- **No auth system.** Identity is resolved from the existing session helper and
  forwarded. Building real authentication is out of scope and is not pretended
  at; routes that need a user and cannot resolve one return `401`.
- **No object storage.** `upload/presign` returns a real presigned URL only when
  storage is configured; otherwise `501` with the missing variable named.
- **No payment processing.** Billing routes read `Subscription`/`Receipt`.
  Checkout and portal require Stripe credentials and return `501` without them.
- **Analytics are computed, not warehoused.** The analytics routes aggregate
  over `GenerationJob` and `UsageMeter` at query time. That is correct at this
  data volume and will need a rollup table later.
