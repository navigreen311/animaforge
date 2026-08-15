# Avatar Studio (X5)

Avatar Studio is AnimaForge's digital-human cluster: reconstruction, skin
scattering, facial rigging and eye motion. This document describes **what the
code does today**, and separates that from what still needs a human to
provision. Where a stage cannot run, it says so rather than describing an
intent as if it were behaviour.

The [Fact Check List](#fact-check-list) at the end names every model weight,
GPU requirement and licence that is still outstanding.

---

## Subsystems

| # | Subsystem | Module | Runs on | Status |
|---|-----------|--------|---------|--------|
| 1 | Reconstruction | `services/ai-api/src/services/avatar/reconstruction.py` | GPU (real) / CPU (mock) | Real engine implemented, **never executed in CI** |
| 2 | Subsurface scattering | `…/avatar/sss.py` | CPU | Implemented |
| 3 | FACS rig | `…/avatar/facs.py` | CPU | Implemented |
| 4 | Eye system | `…/avatar/eyes.py` | CPU | Implemented |

Subsystems 2–4 are closed-form and have no external dependency beyond numpy.
Subsystem 1 is the only one that needs a GPU.

---

## Engines

`AVATAR_ENGINE` selects the reconstruction engine. The choice is visible in
every response.

### `mock` (default)

A procedural CPU engine. It produces **genuine artifacts** — a closed
two-manifold triangle mesh, a real Gaussian splat cloud, a spec-conformant
binary glTF and a standard 3DGS PLY — but the geometry is derived
deterministically from the character identifier. **The reference photographs
are not analysed.**

Responses carry `engine: "mock"`, `is_mock: true` and a `mock_notice`
explaining this, and the Avatar Studio UI shows a "Preview mode — geometry is
procedural" banner.

### `real`

Delegates to nerfstudio's `splatfacto` (3D Gaussian Splatting) through its CLI:
`ns-process-data` for camera poses, then `ns-train`, then the exported `.ply`
is loaded back into the pipeline.

If any dependency is missing, `POST /ai/v1/generate/avatar` returns **503**. It
does not fall back to the procedural engine — a caller who asked for a real
reconstruction must not receive a synthetic one labelled as real.

> **This path has never been executed.** There is no GPU on the CI runner or on
> the development machine this was built on. The code is written against the
> documented nerfstudio CLI; the first run on real hardware should be treated
> as unverified. Its test skips explicitly, naming what is missing.

---

## The 7-step pipeline

`POST /ai/v1/generate/avatar` runs seven stages and reports each one's true
outcome. A stage is `completed` only if it ran; otherwise it is `skipped` with
a `reason`.

| # | Stage | Typical status | Notes |
|---|-------|----------------|-------|
| 1 | `multi_view_alignment` | completed (≥2 photos) | **Skipped with one photo** — a single view gives no multi-view constraint, so no bundle adjustment is performed |
| 2 | `volumetric_reconstruction` | completed | Builds the Gaussian splat cloud; reports `splat_count` and engine |
| 3 | `mesh_extraction` | completed | Reports vertex and triangle counts |
| 4 | `texture_baking` | completed | Per-vertex albedo and spherical UVs. **No raster texture atlas is written** — the GLB carries vertex colour only |
| 5 | `flame_fitting` | **always skipped** | FLAME needs a separately licensed model file. A generic SVD shape basis is fitted instead and reported as `substitute_model` — this is *not* a FLAME fit |
| 6 | `body_estimation` | completed | Proportions scaled from head height using the canonical 7.5-head figure. **No body geometry is reconstructed** |
| 7 | `quality_validation` | **always skipped** | Identity scoring needs a face-recognition model. `identity_score` is `null`, `identity_check_ran` is `false`. Geometric self-consistency checks do run and are reported separately |

Stages 5 and 7 are skipped on **every** host in the current configuration,
including one with a working GPU, because neither model ships with the repo.

### What replaced the old mock

The previous implementation returned a fixed dictionary marking all seven
stages `completed`, an `identity_score` of `0.95` against a 0.92 threshold, and
two `https://cdn.animaforge.ai/...` URLs for files that were never written.
None of those three things happen now.

---

## Artifacts

Every URL in a job record points at bytes that were written. `store_artifact`
writes first and derives the URL from the path it wrote to; there is no code
path that mints a URL for an artifact that does not exist.

| Artifact | Format | Notes |
|----------|--------|-------|
| `avatar.glb` | glTF 2.0 binary | Positions, normals, indexed triangles, six morph targets named to match the FACS solver's blendshape output |
| `splats.ply` | Binary little-endian PLY | Standard 3DGS property names (`x,y,z,nx,ny,nz,f_dc_0..2,opacity,scale_0..2,rot_0..3`), so it loads in splat viewers. Colours stored as zeroth-order SH coefficients |
| `facs_rig.json` | JSON | AU catalogue, antagonist pairs, and solved blendshapes for every emotion prototype |
| `eye_animation.json` | JSON | Per-frame gaze, eyelid and pupil channels plus the saccade and blink event lists |
| `skin_profile.json` | JSON | Per-channel scattering parameters |

Storage backends: `local` (default) writes under `AVATAR_STORAGE_DIR` and
returns a `file://` URL unless `AVATAR_STORAGE_BASE_URL` is set — a `file://`
URL is not servable to a browser, which is deliberate: it is honest about where
the bytes are. `s3` requires `boto3` and `AVATAR_S3_BUCKET`, and raises if
either is absent rather than fabricating a CDN URL.

> The default `AVATAR_STORAGE_DIR` is `var/avatar-artifacts`, relative to the
> working directory. It is not in `.gitignore` (that file is outside this
> track's ownership), so either set an absolute path or add `var/` yourself.

---

## Subsystem 2 — subsurface scattering

Two-layer epidermis/dermis tissue optics feeding the Jensen dipole diffusion
approximation, evaluated at 600 / 550 / 450 nm.

- Melanin absorption: `6.6e11 * λ^-3.33` (Jacques 1998), in **1/cm**
- Baseline tissue absorption: `0.244 + 85.3 * exp(-(λ-154)/66.2)`, in 1/cm
- Whole-blood absorption at 150 g/L haemoglobin, from Prahl's molar extinction
  tabulation via `μa = 2.303 · ε · c`
- Reduced scattering: `46 · (λ/500)^-1.421` /cm (Jacques 2013)
- Diffusion: `Rd`, transport coefficient and diffusion length per Jensen et
  al. 2001

Published fits are in 1/cm; the module converts to 1/mm so results compose with
millimetre tissue thicknesses.

**Known approximation.** The two-layer stack is reduced to one effective layer
by weighting each layer's absorption by its share of the total thickness. A
true solution would solve the diffusion equation per layer with matched
boundary conditions. The reduction biases diffusion lengths short relative to
Jensen's measured `skin1` values (~0.48 mm red here versus ~3.7 mm there), so
these should be treated as physically-derived starting points for a look-dev
pass, not as measured constants.

---

## Subsystem 3 — FACS

27 action units, each with its muscle basis and the ARKit blendshape targets it
drives, over the full 52-target set.

- FACS `A`–`E` intensity letters map to 0.2–1.0
- **Antagonist resolution**: opposing targets (`eyeWide` vs `eyeSquint`,
  `mouthSmile` vs `mouthFrown`, `browInnerUp` vs `browDown`) reduce to their net
  difference. A target's opposing drive is its *strongest single* antagonist,
  not their sum — `browInnerUp` is opposed by both `browDownLeft` and
  `browDownRight`, and subtracting both would wrongly zero a brow raise that
  should survive
- **Exclusive mouth aperture**: AU25 / AU26 / AU27 cannot co-fire; the widest
  wins, because a jaw has one position
- Ekman's prototypical AU combinations for the six basic emotions plus contempt

Endpoints: `GET /ai/v1/avatar/facs/action-units`,
`POST /ai/v1/avatar/facs/solve`.

---

## Subsystem 4 — eye system

`POST /ai/v1/avatar/eyes/simulate` returns a sampled per-frame animation curve,
not a static parameter set.

- **Saccades** on the Bahill main sequence,
  `Vpeak = 700 · (1 - e^(-A/10))` deg/s, with duration derived from that peak
  velocity so the two stay consistent (`D = 1.875·A/Vpeak` for a minimum-jerk
  trajectory). Fixation durations are lognormal
- **Blinks** as a Poisson process with a physiological refractory floor and an
  asymmetric waveform — 85 ms closing, 20 ms closed, 165 ms reopening
- **Pupil** from the Stanley & Davies term of Watson & Yellott (2012) under a
  first-order lag (230 ms latency, 1 s time constant) with hippus

Measured against literature in `tests/test_avatar_eyes.py`: a 5° saccade runs
275 deg/s over 34 ms and a 20° saccade 605 deg/s over 62 ms; blink rate tracks
the requested 17/min to within ~2%; pupil spans 6.0 mm at 1 cd/m² to 2.7 mm at
1000 cd/m².

---

## Persistence

Artifacts are stored on the existing `Character` columns. **No migration is
needed** — `hairParams`, `wardrobe`, `bodyParams`, `facsRigUrl`, `gltfUrl`,
`isDigitalTwin` and `styleMode` are already on the model.

```
PUT /api/v1/characters/:id/hair      -> hairParams
PUT /api/v1/characters/:id/wardrobe  -> wardrobe
PUT /api/v1/characters/:id/avatar    -> gltfUrl, facsRigUrl, bodyParams,
                                        styleMode, isDigitalTwin
```

`isDigitalTwin` is set only when the reconstruction was real. Flagging
procedural output as a digital twin would give the character a provenance it
does not have.

Hair and wardrobe writes **replace** rather than merge, because the tabs submit
their full state and merging would make removing a property impossible. Avatar
artifact writes are the opposite — only the fields present are written, so a
partial result cannot blank a URL an earlier successful run stored.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/ai/v1/avatar/capabilities` | True dependency state: torch, gsplat, CUDA, weights, active engine, what is missing |
| `POST` | `/ai/v1/generate/avatar` | Run the 7-step pipeline. `503` when `AVATAR_ENGINE=real` cannot be honoured |
| `POST` | `/ai/v1/avatar/skin` | Subsystem 2 |
| `GET` | `/ai/v1/avatar/facs/action-units` | Subsystem 3 catalogue |
| `POST` | `/ai/v1/avatar/facs/solve` | Subsystem 3 solver |
| `POST` | `/ai/v1/avatar/eyes/simulate` | Subsystem 4 |

Query capabilities before offering to run a job — that is what the Avatar
Studio banner is driven from.

---

## Running it

```bash
# CPU only — this is what CI installs
cd services/ai-api
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001

curl localhost:8001/ai/v1/avatar/capabilities

curl -X POST localhost:8001/ai/v1/generate/avatar \
  -H 'Content-Type: application/json' \
  -d '{"character_id":"demo","photos":["a.jpg","b.jpg"],"skin_tone":"#C68642"}'
```

For the real engine, on a CUDA host:

```bash
pip install -r requirements.txt
pip install -r requirements-ml.txt   # torch, gsplat, nerfstudio, pycolmap
apt-get install colmap               # system package, not a wheel

export AVATAR_ENGINE=real
export AVATAR_WEIGHTS_DIR=/opt/animaforge/weights

curl localhost:8001/ai/v1/avatar/capabilities   # verify before trusting output
```

### Tests

```bash
cd services/ai-api && pytest -v          # 200 avatar + mocap tests
cd services/platform-api && npx vitest run
cd apps/web && npx tsc --noEmit && npx vitest run
```

The real-engine test skips explicitly, printing what is missing. It never
passes silently on a host that cannot run it.

### CI

`requirements.txt` carries only numpy beyond the original FastAPI stack, so the
pytest job stays installable on a standard runner. `torch`, `gsplat`,
`nerfstudio` and `pycolmap` live in `requirements-ml.txt`, which CI never
installs — several GB and no CUDA device would make that job unworkable.

---

## Known gaps

Things a reader might reasonably expect that are **not** true:

1. **The Avatar Studio's stage-to-stage animation still runs on timers.** The
   eight-stage strip advances on a fixed schedule while the request is in
   flight. It is a progress indicator, not a report of backend state. The
   authoritative account of what ran is the "Last run" panel and the job
   record's `steps_completed`.
2. **Photo quality checks in the UI are still simulated.** `faceDetected` and
   `goodLighting` come from `Math.random()`. No face detector runs.
3. **No texture atlas.** Vertex colour only.
4. **No hair or cloth simulation.** The hair parameters the Hair tab stores are
   persisted but drive no simulation.
5. **`parse_bvh` and `parse_fbx_motion` do not read their files** — they return
   a synthetic skeleton. `GET /ai/v1/mocap/formats` reports this per format via
   `support[fmt].parsed`. C3D and TRC *are* parsed for real.
6. **C3D DEC and MIPS encodings are rejected**, not decoded. Analog channels
   are skipped.

---

## Fact Check List

Everything below needs a human decision or a download. Nothing here is
provisioned by this branch.

### Model weights

| Item | Needed for | Licence | Where |
|------|-----------|---------|-------|
| **FLAME** head model (`FLAME2020/generic_model.pkl`) | Step 5, `flame_fitting`. Until provisioned the stage reports `skipped` | **Non-commercial research licence.** Commercial use requires a separate agreement with the Max Planck Society — this is a legal blocker for a commercial product, not just a download | flame.is.tue.mpg.de (registration required). Set `AVATAR_FLAME_MODEL_PATH` |
| **Face-recognition embedder** (e.g. ArcFace / InsightFace `buffalo_l`) | Step 7 identity scoring against the 0.92 threshold. Until provisioned `identity_score` is `null` | InsightFace models are released for **non-commercial research use**. Verify before shipping | Set `AVATAR_IDENTITY_MODEL_PATH` |
| **nerfstudio / splatfacto weights** | `AVATAR_ENGINE=real`. splatfacto optimises per scene, so there is no pretrained checkpoint, but `ns-process-data` may pull auxiliary models | nerfstudio and gsplat are Apache-2.0 | `AVATAR_WEIGHTS_DIR` |

### Hardware

- **NVIDIA GPU, compute capability ≥ 7.0, ≥ 12 GB VRAM** for splatfacto at
  default resolution. Not present on GitHub-hosted runners.
- **COLMAP** as a system package (`apt-get install colmap`) for camera pose
  estimation. `pycolmap` alone is not sufficient.
- `torch==2.3.1` must match the host CUDA runtime; install from the correct
  PyTorch wheel index.

### Unverified claims

- **The real reconstruction path has never been run.** It is written against
  the documented nerfstudio CLI. Expect the first GPU run to need adjustment —
  particularly the `.ply` export location, which is discovered by globbing the
  run directory.
- **`splats_from_mesh` produces splats sampled from a surface, not optimised
  against images.** In mock mode they are a faithful surface representation,
  not a radiance field.
- **The SSS single-layer reduction** biases diffusion lengths short (see
  Subsystem 2). Verify against a reference render before using these values as
  shipping defaults.
- **Blood absorption values** are interpolated from Prahl's tabulation at three
  wavelengths. 550 nm sits near a haemoglobin Q-band peak where the spectrum
  moves fast, so that channel is the most sensitive to the exact wavelength
  chosen.
- **`estimate_body_proportions` is a scaling rule, not a measurement.** It
  assumes a canonical 7.5-head adult figure. It will be wrong for children,
  stylised characters, and anyone outside that proportion.

### Operational

- `AVATAR_STORAGE_BACKEND=local` returns `file://` URLs that a browser cannot
  fetch. Set `AVATAR_STORAGE_BASE_URL` or use the `s3` backend before exposing
  artifact URLs to clients.
- Photo URLs are passed to the AI API as-is. In the Avatar Studio these are
  `blob:` URLs from `URL.createObjectURL`, which the **server cannot resolve**.
  Uploading reference photos to reachable storage first is not implemented.
