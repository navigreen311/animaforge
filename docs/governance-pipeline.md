# AnimaForge Governance Pipeline

Every piece of AI-generated content passes through a mandatory four-stage
governance pipeline before delivery.

```mermaid
flowchart LR
  INPUT[Generated Output] --> S1[Stage 1: Content Moderation]
  S1 -->|pass| S2[Stage 2: Consent Validation]
  S1 -->|fail| BLOCK1[Blocked / Flagged]
  S2 -->|pass| S3[Stage 3: Watermarking]
  S2 -->|fail| BLOCK2[Blocked / Consent Required]
  S3 --> S4[Stage 4: C2PA Signing]
  S4 --> DELIVER[Delivered to User]
  DELIVER --> X4[X4: Piracy Monitoring]
```

> **Stage order changed.** Signing used to be documented before watermarking.
> That order cannot work now that both are real: signing binds a hash of the
> asset bytes, and watermarking afterwards would alter those bytes and
> invalidate the signature. Watermark first, then sign.

Stages 1 and 2 are documented below as before. Stages 3 and 4, and the X4
piracy monitoring that depends on them, were rebuilt; sections 3 onward describe
what the code actually does today, **including what it cannot do**. Anything
depending on a credential, binary or model this repository does not ship is
called out explicitly and reported at runtime by a capability endpoint rather
than assumed.

---

## Stage 1: Content Moderation

### Purpose

Scan all generated content for policy violations before any further processing.

### Checks Performed

| Check                    | Threshold    | Action on Fail          |
| ------------------------ | ------------ | ----------------------- |
| **NSFW**                 | Score > 0.15 | Block + flag for review |
| **Violence**             | Score > 0.30 | Block + flag for review |
| **Bias/Stereotypes**     | Score > 0.20 | Block + flag for review |
| **Copyright Similarity** | Score > 0.85 | Block + legal review    |

### Process

1. Generated frames are sampled (every 12th frame for video, all frames for images)
2. Each sample is passed through the moderation model ensemble
3. Audio is transcribed and checked for harmful content
4. Scores are aggregated across all samples
5. If any check exceeds its threshold, the output is blocked

### Override Policy

- Enterprise admins can adjust thresholds within platform-defined bounds
- Human reviewers can override automated decisions with documented justification
- All overrides are recorded in the audit log

---

## Stage 2: Consent Validation

### Purpose

Verify that all character likenesses used in generated content have valid consent records.

### Consent Model

```mermaid
stateDiagram-v2
  [*] --> Pending: Character Created
  Pending --> Requested: Consent Request Sent
  Requested --> Approved: Rights Holder Approves
  Requested --> Denied: Rights Holder Denies
  Approved --> Expired: TTL Exceeded
  Expired --> Requested: Re-request
  Denied --> Requested: Re-request
```

### Consent Types

| Type               | Duration              | Scope                        |
| ------------------ | --------------------- | ---------------------------- |
| **Perpetual**      | Indefinite            | All projects by this creator |
| **Project-scoped** | Duration of project   | Single project only          |
| **Time-limited**   | Specified end date    | All projects until expiry    |
| **Commercial**     | Per license agreement | Commercial use permitted     |
| **Non-commercial** | Per license agreement | Personal/educational only    |

### Validation Process

1. Extract all character IDs referenced in the generation job
2. For each character, query the `consent_records` table
3. Verify consent is in `approved` status and not expired
4. Verify consent scope matches the project's usage type
5. If any character lacks valid consent, block delivery and notify the creator

### Self-Owned Characters

Characters marked as `self_created: true` with no real-person likeness reference automatically pass consent validation. The creator is the sole rights holder.

---

## 3. What replaced what

| Concern             | Before                                                                                                                              | Now                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| C2PA signing        | Bespoke JSON manifest, HMAC-SHA256 with the hardcoded string `animaforge-c2pa-dev-secret`, stored beside the asset in `audit_trail` | Standards-conformant C2PA manifest, COSE-signed via `c2pa-node` with a real X.509 chain and an RFC 3161 timestamp, **embedded into the asset bytes** |
| Watermarking        | `output_url + "?wm=<uuid>"`, then SHA-256 of that string                                                                            | 64-bit payload written into mid-low frequency DCT coefficients of 8×8 luma blocks — real pixel changes that survive re-encoding                      |
| Watermark detection | Database lookup of the URL hash                                                                                                     | Extraction from the media itself, CRC-validated                                                                                                      |
| Piracy matching     | Exact hash lookup, plus `Math.random()` for scan results                                                                            | 64-bit perceptual hash (pHash/aHash/dHash) with a Hamming-distance threshold                                                                         |
| Storage             | Everything overloaded onto `AuditTrail`                                                                                             | Dedicated `C2PAManifest`, `Watermark` and `Fingerprint` models                                                                                       |

The old `audit_trail` rows are not deleted — it is an audit log — but the
migration re-labels their `action` to `legacy:c2pa:manifest` /
`legacy:watermark:embed` so nothing reads them as live provenance.

---

## 4. Architecture

```mermaid
flowchart TB
    subgraph Generation
        JOB[Generation job] --> ASSET[Rendered asset]
    end

    subgraph Governance
        ASSET --> WM[watermark service :3007]
        WM -->|marked bytes| C2PA[c2pa service :3006]
        C2PA -->|signed + embedded bytes| CDN[(Delivery / CDN)]
        WM -.->|payload -> job index| DB[(Postgres)]
        C2PA -.->|provenance record| DB
    end

    subgraph Protection
        CDN --> FP[piracy service :3016]
        FP -->|fingerprint| DB
        WEB[Web: suspect copy] --> FP
        FP -->|recover watermark| WM
        FP -->|PiracyMatch + DMCANotice| DB
    end

    VERIFY[/verify/:outputId] --> C2PA
```

**Order matters.** Watermark first, then sign. Signing embeds a hash of the asset
bytes; watermarking afterwards would alter those bytes and invalidate the
signature. The reverse order is safe and is what the pipeline does.

---

## 5. C2PA provenance (Stage 4)

### Library choice: `c2pa-node`, not `c2patool`

Both wrap the same `c2pa-rs` core and produce identical manifests. The deciding
factor was provisioning:

- **`c2patool`** is a standalone Rust binary. Someone has to download it,
  version-pin it, and put it on `PATH` in every image and on every developer
  machine. `npm ci` cannot do that, and when it is missing the failure surfaces
  as a confusing `ENOENT` from a `child_process` call.
- **`c2pa-node`** ships prebuilt native bindings for `x86_64`/`aarch64` Linux,
  Intel/Apple-Silicon macOS and `x86_64` Windows, and its `postinstall` script
  fetches the right one from the package's GitHub release. A plain `npm ci`
  produces a working signer on every platform this repo targets, with no Rust
  toolchain.

It was verified to install and sign on Windows (`x86_64-pc-windows-msvc`) during
development; the Linux binary used by CI is published for the same version.

**Consequences you must know about:**

- `npm ci --ignore-scripts` will **not** fetch the binding. The service then
  reports `signing.library_available: false` and runs degraded.
- Installation needs network access to `github.com` release assets.
- The version is pinned exactly (`c2pa-node: 0.5.26`) because the binding is
  fetched by version.

### Timestamping is mandatory

`c2pa-node` 0.5.x types the signer's `tsaUrl` as a required string. Omitting it
makes the native binding throw `TypeError: failed to downcast any to string`;
supplying an unreachable one fails the sign call outright. **Signing therefore
requires a reachable RFC 3161 timestamp authority.** `C2PA_TSA_URL` selects it
and defaults to `http://timestamp.digicert.com`.

This is a real production dependency: if the TSA is down, signing fails, and the
service records a degraded entry rather than an unsigned one it might later
misreport.

### Certificate requirements

`C2PA_SIGNING_CERT` and `C2PA_PRIVATE_KEY` each hold either an inline PEM or a
path to one. The leaf certificate must satisfy the C2PA signing profile:

- `basicConstraints = critical, CA:FALSE`
- `keyUsage = critical, digitalSignature` (`nonRepudiation` is fine too)
- `extendedKeyUsage = critical, emailProtection` (or `documentSigning`)
- ECDSA P-256 for the default `es256`
- The chain is leaf-first, with issuers appended

The private key must be **PKCS#8** (`-----BEGIN PRIVATE KEY-----`). `c2pa-rs`
rejects SEC1 (`-----BEGIN EC PRIVATE KEY-----`); convert with
`openssl pkcs8 -topk8 -nocrypt -in leaf.sec1.key -out leaf.key`.

### The three modes

`POST /governance/c2pa/sign` always returns 201, and always says which mode it
was in:

| `mode`            | `signed` | `embedded` | When                                                                               |
| ----------------- | -------- | ---------- | ---------------------------------------------------------------------------------- |
| `c2pa-embedded`   | `true`   | `true`     | Credentials present, library loaded, asset supplied, signing succeeded             |
| `unsigned-record` | `false`  | `false`    | Credentials present but no asset bytes were sent — there was nothing to embed into |
| `degraded`        | `false`  | `false`    | No credentials, no library, or signing failed                                      |

Only `c2pa-embedded` produces a signature. The other two carry
`degraded: true` and a `warning` string. **There is no fallback signature.** The
`animaforge-c2pa-dev-secret` HMAC is gone, and a test asserts the string does not
appear in any response.

### Verification: two endpoints, two strengths

- `GET /governance/c2pa/verify/:outputId` — looks up the provenance record. If the
  recorded asset is still readable from this service it validates it for real;
  otherwise it answers `status: "unverified"`. A record proves we generated
  something, not that a particular file is authentic.
- `POST /governance/c2pa/verify` with the asset bytes — the authoritative check,
  and **the only path that can return `status: "valid"`**.

`cryptographically_verified` is set only from the library's own validation
result. The five states are `valid`, `invalid`, `absent` (no manifest in the
asset), `unverified` (nothing was checked) and `not_found`.

### Assertions embedded

- `c2pa.actions` — `c2pa.created` with `digitalSourceType:
trainedAlgorithmicMedia`, the IPTC code for model-generated media
- `stds.schema-org.CreativeWork`
- `com.animaforge.generation` — job, project, shot, model, input hash, consent
  ids, watermark id, and a **SHA-256 hash of the user id**, never the raw id,
  because manifests travel with the file

---

## 6. Invisible watermarking (Stage 3)

### Algorithm `dct-pair-v1`

Each of 64 payload bits is carried by the _sign of the difference_ between DCT
coefficients `(1,2)` and `(2,1)` of an 8×8 luma block — the Koch-Zhao
coefficient-pair construction. Writing a bit pushes the pair symmetrically apart
around their mean, so block average energy is preserved.

Robustness comes from redundancy, not from strength: the payload is repeated
across every available block and read back by majority vote. The blocks are
visited in a seeded pseudorandom order so a local edit degrades every bit a
little rather than destroying a few outright.

The blocks align with the JPEG 8×8 grid deliberately — the perturbation is
quantised _alongside_ image content rather than smeared across it.

**Payload framing:** 48-bit key + 16-bit CRC-16/CCITT. Detection reports a find
only when the CRC validates, which is what makes "not detected" trustworthy: a
random 64-bit read has a ~1-in-65 536 chance of passing.

**Measured** on a 512×512 synthetic frame, strength 20:

| Transform                      | Result                   |
| ------------------------------ | ------------------------ |
| Lossless (PNG)                 | 64/64 bits, PSNR ≈ 43 dB |
| JPEG q80 / q65 / q50 / q40     | 64/64 bits               |
| JPEG q35                       | 64/64 bits               |
| Double re-encode (q70 → q55)   | Recovered                |
| H.264 CRF 30 re-encode (video) | Recovered                |

**What it does not survive:** resize, crop, rotation, heavy blur. Geometric
attacks are the job of perceptual fingerprinting (§7), not of this watermark.
This is a deliberate division of labour, not an oversight.

### Keying

`WATERMARK_SEED` keys block placement. Every record stores the seed it was
written with, and detection tries all known seeds, so rotating the seed does not
orphan existing marks as long as their rows survive. An attacker without the seed
cannot read the payload; the watermark is not a secrecy mechanism, but the seed
raises the cost of stripping it selectively.

### Video

Every frame is marked, so a clip cut from the middle still carries the payload,
and detection majority-votes across sampled frames. This requires **ffmpeg and
ffprobe**, which this repo does not vendor. When they are absent,
`video_watermarking.available` is `false` and video requests fail loudly rather
than silently doing nothing.

Embedding necessarily re-encodes (altering pixels means rebuilding the
bitstream), so the encoder CRF bounds how much of the mark survives the write.
It defaults to 16.

### TrustMark

TrustMark was evaluated and is wired in as an **optional** backend
(`services/governance/watermark/src/lib/trustmark.ts`). It is a Python package
that pulls in torch plus roughly 200 MB of model weights — neither belongs in a
Node service image or in CI, and neither is shipped here.

Set `WATERMARK_ENGINE=trustmark` and `TRUSTMARK_PYTHON=/path/to/venv/bin/python`
after `pip install trustmark` to request it. If it is requested but not
importable, the capability endpoint says so and the service uses `dct-pair-v1`;
it never claims to have run TrustMark. A test asserts this.

The built-in `dct-pair-v1` engine needs no credential, no model and no GPU, which
is why it is the default rather than a fallback.

### Honest embedding modes

| `mode`            | `embedded` | When                                                                                     |
| ----------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `embedded`        | `true`     | Asset bytes supplied; pixels were altered                                                |
| `registered-only` | `false`    | No asset supplied — a database row exists but **the media is unmarked and undetectable** |

Detection never reports a hit from a URL lookup. `detect` with only a
`content_url` returns `detected: false` and a reason, unless
`WATERMARK_ALLOW_REMOTE_FETCH=true` lets the service download and analyse the
bytes. Server-side fetching of arbitrary URLs is an SSRF pivot, so it is off by
default.

---

## 7. Perceptual fingerprinting (X4)

`phash-dct64`: reduce to 32×32 luma, 2-D DCT, keep the top-left 8×8
low-frequency block, threshold against the median of its non-DC terms → 64 bits.
`aHash` and `dHash` are computed alongside as secondary signals for reviewers.

Matching is a **Hamming-distance search**, not an equality lookup. Default
threshold is 10 bits of 64 (`FINGERPRINT_MATCH_THRESHOLD`), the conventional
pHash value.

**Measured** on a 640×480 synthetic frame:

| Transform       | pHash distance |
| --------------- | -------------- |
| JPEG q80 / q40  | 0              |
| JPEG q15        | 2              |
| Resize 50%      | 0              |
| Resize 25%      | 10             |
| Crop 5% border  | 14             |
| Crop 15% border | 24             |
| Brightness +20% | 0              |
| Unrelated image | 28             |

**Read the last two rows carefully.** A 15% crop (24) and unrelated content (28)
are not far apart. Global perceptual hashing does not reliably catch crops beyond
roughly 10% of the frame, rotations, or heavy letterboxing — and the margin
narrows as the crop grows. This limitation is reported in
`/piracy/capabilities → fingerprinting.known_limitations`. Closing it needs
block-level or keypoint-based hashing, which is not implemented.

Video fingerprints sample 9 frames evenly across the timeline and compare
sequences frame-by-frame over the shorter of the two, so a clip cut from a longer
original still scores close. Requires ffmpeg.

Matching is currently a **linear scan** over stored fingerprints. It needs a
BK-tree or ANN index before roughly 10⁵ fingerprints.

### Web scanning

Two independent stages, each of which can be unavailable on its own:

1. **Discovery** — find candidate URLs. Needs an external search index, which
   this repo does not ship. `PIRACY_SEARCH_PROVIDER=http` plus
   `PIRACY_SEARCH_ENDPOINT` points at any gateway that accepts
   `POST {query, platform, limit}` and returns `{results: [{url, media_url?}]}`.
2. **Verification** — download each candidate, fingerprint it, compare. Needs
   `PIRACY_ALLOW_REMOTE_FETCH=true`.

With neither configured — the default — a scan returns zero matches, sets
`degraded: true`, and lists exactly what is missing. It does not invent matches.
The previous implementation returned `Math.floor(Math.random() * 3)` fabricated
hits per scan.

A confirmed match writes a `PiracyMatch` row carrying `matchMethod`,
`hammingDistance`, `fingerprintId`, `watermarkId` and an `evidence` JSON blob;
filing a takedown writes a `DMCANotice` row.

---

## 8. Data model

One migration: `20260814120000_real_provenance_watermark_fingerprint`.

- **`c2pa_manifests`** — one row per signed or attempted output. `signed`,
  `embedded`, `mode` and `degraded_reason` are what separate real provenance from
  a degraded record. Indexed on `job_id` and `signed_asset_sha256`.
- **`watermarks`** — index from a recovered `payload_hex` back to a job. Stores
  the `seed` and `algorithm` so old marks stay readable after rotation.
- **`fingerprints`** — `phash`/`ahash`/`dhash` plus `frame_hashes[]` for video.
- **`piracy_matches`** — gains `fingerprint_id` (FK), `match_method`,
  `hamming_distance`, `watermark_id`, `evidence`.
- **`dmca_notices`** — gains `platform` and `body`.

`piracy_matches` and `dmca_notices` existed in `schema.prisma` but had never been
emitted by any migration, so the migration creates them `IF NOT EXISTS` before
altering them. This is pre-existing drift being repaired, not introduced.

Every service degrades to an in-memory store when `DATABASE_URL` is unset, and
says so through `database.connected: false`.

---

## 9. Capability endpoints

Every optional dependency is reported, never assumed:

| Endpoint                                 | Reports                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /governance/c2pa/capabilities`      | library loaded, credentials present, algorithm, TSA URL, degraded reasons                                 |
| `GET /governance/watermark/capabilities` | active engine, ffmpeg state, TrustMark state, remote-fetch flag                                           |
| `GET /piracy/capabilities`               | image/video fingerprinting, discovery provider, watermark-service URL, match threshold, known limitations |
| `GET /health/detailed` (all three)       | the above, with `status: "ok" \| "degraded"`                                                              |

The `/verify/:outputId` page and the piracy dashboard both read these and show a
banner when the pipeline is reduced, so the UI never looks equally confident
whether or not the pipeline is wired up.

---

## 10. Testing

Both paths are covered, and they assert different things.

```bash
npx vitest run services/governance/c2pa      # 14 tests
npx vitest run services/governance/watermark # 22 tests
npx vitest run services/piracy               # 22 tests
```

**The real C2PA path is genuinely exercised.** No certificates are committed.
`src/__tests__/helpers/testPki.ts` generates a throwaway CA, an
`emailProtection` signing leaf and a `timeStamping` leaf into a temp directory,
then starts a **local RFC 3161 timestamp authority** backed by `openssl ts
-reply` on a random port. The suite signs a real JPEG, asserts the manifest is
embedded in the bytes, validates it cryptographically, and asserts a
bit-flipped copy comes back `invalid`.

If `openssl` or the `c2pa-node` binding is missing, that block is
`describe.skip`ped with the reason in the suite name — a loud skip, never a
silent pass. Same for the ffmpeg-gated video blocks.

The watermark suite's load-bearing test embeds a payload, re-encodes at JPEG
quality 80/65/50/40, and asserts recovery at each — plus a double re-encode and
an H.264 CRF-30 video round trip.

---

## 11. Demo

```bash
# 1. Generate a dev signing chain (throwaway, not for production)
openssl ecparam -name prime256v1 -genkey -noout -out ca.key
openssl req -new -x509 -key ca.key -sha256 -days 3650 -out ca.crt \
  -subj "/C=US/O=AnimaForge Dev/CN=AnimaForge Dev Root CA"
openssl ecparam -name prime256v1 -genkey -noout -out leaf.sec1.key
openssl pkcs8 -topk8 -nocrypt -in leaf.sec1.key -out leaf.key
openssl req -new -key leaf.key -out leaf.csr \
  -subj "/C=US/O=AnimaForge Dev/OU=FOR TESTING ONLY/CN=AnimaForge Dev Signer"
printf '[e]\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=critical,emailProtection\n' > leaf.cnf
openssl x509 -req -in leaf.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out leaf.crt -days 3650 -sha256 -extfile leaf.cnf -extensions e
cat leaf.crt ca.crt > chain.pem

export C2PA_SIGNING_CERT=$PWD/chain.pem
export C2PA_PRIVATE_KEY=$PWD/leaf.key

# 2. Start the services
(cd services/governance/watermark && npm run dev)   # :3007
(cd services/governance/c2pa      && npm run dev)   # :3006
(cd services/piracy               && npm run dev)   # :3016

# 3. Confirm they admit what they can do
curl -s localhost:3006/governance/c2pa/capabilities | jq .signing.available
curl -s localhost:3007/governance/watermark/capabilities | jq .engine
curl -s localhost:3016/piracy/capabilities | jq .degraded_reasons

# 4. Watermark, then sign (order matters — see §4)
B64=$(base64 -w0 still.png)
curl -s -X POST localhost:3007/governance/watermark/embed \
  -H 'content-type: application/json' \
  -d "{\"job_id\":\"demo\",\"asset_base64\":\"$B64\",\"mime_type\":\"image/png\"}" \
  | jq -r .asset_base64 > marked.b64
```

Verify a file at `/verify/<outputId>` in the web app, or post the bytes to
`POST /governance/c2pa/verify` for the authoritative answer.

---

## 12. Known gaps

- **Crop and rotation robustness.** See §7. Needs block-level hashing.
- **Fingerprint search is O(n).** Needs a BK-tree/ANN index at scale.
- **DCT and ffmpeg helpers are duplicated** between the watermark and piracy
  services. They cannot share code today because `services/governance/*` and
  `services/piracy` are separate npm workspaces with their own `rootDir`. The
  right home is `packages/shared`.
- **No CI coverage for these services.** `.github/workflows/ci.yml` runs Vitest
  only for `apps/web` and `services/platform-api`, and type-checks a fixed list
  of services that includes neither `governance/*` nor `piracy`. Adding them
  requires editing `.github/**`.
- **Audio provenance** is unimplemented; only image and video are handled.

---

## 13. Pipeline integration

### Timing

Stages 1 and 2 are cheap: moderation is dominated by frame sampling, consent is
a database lookup. Stages 3 and 4 are not, and their cost is now real work
rather than a hash:

- **Watermarking** is O(pixels) per frame, and video embedding must decode and
  re-encode the whole clip. Budget it against clip length and resolution, not
  against a fixed number.
- **C2PA signing** performs a round trip to an external RFC 3161 timestamp
  authority, so its latency is bounded by that network call, not by the crypto.

The previously documented per-stage figures described the placeholder
implementations and no longer apply. Measure on your own hardware and media.

### Failure handling

- If any stage fails, the output is quarantined — not delivered, not deleted.
- The creator is notified with the stage that failed and why.
- Quarantined outputs can be reviewed by admins in the governance dashboard.
- Outputs failing moderation three times are permanently blocked.
- If **signing** fails (no credentials, no library, TSA unreachable), the asset
  is still recorded, but as `mode: "degraded"`. It must not be presented as
  verified provenance anywhere downstream.

### Audit trail

Pipeline execution still writes an `audit_trail` row. Provenance itself no
longer lives there — it has its own tables (§8) — so the audit row records the
outcome, not the evidence:

```sql
INSERT INTO audit_trail (user_id, action, resource, resource_id, details)
VALUES (
  $1, 'governance_complete', 'generation_output', $2,
  '{"moderation_passed": true, "consent_valid": true,
    "c2pa_mode": "c2pa-embedded", "c2pa_signed": true,
    "watermark_mode": "embedded", "pipeline_duration_ms": 3200}'
);
```
