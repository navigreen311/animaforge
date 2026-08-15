# Generation Pipeline — engine status

What in `services/ai-api` is real, what is gated behind provisioning, and what
is still a placeholder. The runtime equivalent of this table is
`GET /ai/v1/capabilities`, which reports the same thing by probing the host it
is running on. Where this document and that endpoint disagree, the endpoint is
right — it is derived from the machine, this is written by hand.

## Status meanings

| Status | Means |
| --- | --- |
| **real** | A genuine implementation runs by default. Nothing to provision. |
| **real-gated** | A genuine implementation exists but needs weights, a GPU or a binary. Mock until provisioned. |
| **mock** | No engine adapter is written. Output is synthetic and every response says so. Provisioning does not change this — the adapter has to be written first. |

## Clusters

| Cluster | Engine | Status | What a human must provision |
| --- | --- | --- | --- |
| **E3** | Scene graph | **real** | Nothing. Deterministic decomposition and 3D reasoning, CPU only. |
| **E8** | Mocap | **real** | Nothing. BVH/FBX/C3D/TRC parsing, retargeting, IK on CPU. |
| **F5** | Physics | **real** | Nothing. Position-based dynamics for cloth, hair, rigid body, fluid on CPU. |
| **G6** | Auto-QC | **real** | Nothing for loudness, temporal stability, A/V sync, container validation. `ffmpeg`/`ffprobe` on PATH widens what can be decoded — without it, audio measurement is limited to PCM WAV and frame measurement to PNG. |
| **E6** | Continuity | **real** | Nothing for the handcrafted perceptual descriptor. `open_clip_torch` + `CONTINUITY_WEIGHTS_DIR` + `CONTINUITY_ENGINE=real` add semantic matching. |
| **X5** | Avatar | **real-gated** | `torch`, `gsplat`, `nerfstudio`, COLMAP, a CUDA GPU (compute ≥ 7.0, ≥ 12 GB VRAM), `AVATAR_WEIGHTS_DIR`, `AVATAR_ENGINE=real`. See [avatar-studio.md](avatar-studio.md). |
| **D3/D6** | Video | **mock** | No adapter written. `diffusers`/`transformers`/`accelerate` + weights are necessary but not sufficient. |
| **D4** | Audio / lip-sync | **mock** | No adapter written. `torchaudio` + a TTS and forced-alignment model. |
| **X6** | Style intelligence | **mock** | No adapter written. `open_clip_torch` + weights. |
| **G2** | Dubbing | **mock** | No adapter written. `torchaudio` + a multilingual TTS and voice-cloning model. |
| **D10** | Training | **mock** | No adapter written. `peft` + `diffusers` + a GPU. |
| **F3** | Music | **mock** | No adapter written. `audiocraft` + weights. |

Five real, one real-gated, six mock.

## What changed in this round

**Eight routers were mounted.** `continuity`, `dubbing`, `mocap`, `music`,
`physics`, `scene_graph`, `script_chat` and `training` shipped with route
modules, services and passing tests, and were never included in `src/main.py`.
Fifty endpoints returned 404 on the running service, including all of E3, a P0
cluster. Their tests passed because each `tests/test_*_api.py` builds its own
`FastAPI()` and mounts the router by hand — which proves a router works in
isolation and nothing about whether the service exposes it.
`tests/test_router_mounting.py` now goes through `src.main.app`, and
`test_every_route_module_is_mounted` fails for any future route module that is
never wired up.

**E3 gained the layer it was missing.** `scene_graph_engine.py` was never a
mock — 470 lines of real 3D reasoning. But all eight of its endpoints *consume*
a scene graph and nothing produced one, so the step from a director's sentence
to a structured scene did not exist. `scene_decomposition.py` is that step:
prompt → subject, environment, camera, lens, action, emotional beat, timing,
dialogue cue, lighting state, continuity dependency → a graph the existing
engine parses. Deterministic, no model.

Every field records whether it was `matched` from the prompt, `derived` by
rule, or `default`ed, and a `coverage` block names the defaults. A caller can
distinguish "the director asked for a close-up" from "we assumed a medium shot
because nobody said" — which matters before the next stage spends GPU-hours on
the assumption.

**G6 measures the artifact instead of its URL.** `qc_ml_metrics.py` seeds every
score from a hash of the input string, so two different renders at the same URL
score identically. `qc_measurement.py` implements ITU-R BS.1770-4 / EBU R128
loudness, flicker from real inter-frame differences, A/V sync by
cross-correlation, and container validation from magic numbers.

**E6 compares pixels instead of identifiers.** `_mock_embedding` hashed the
shot reference, so two frames from one take got uncorrelated vectors.
`continuity_embedding.py` computes a 104-dimension descriptor from the image —
colour histograms, a 4×4 spatial grid, a Sobel gradient histogram — decoding
PNG with stdlib `zlib`.

**Nothing unmeasured is presented as measured.** When QC cannot open an
artifact the verdict is `unmeasurable` and `passed` is `false`, not a score
derived from the URL. When continuity cannot decode a reference the result
carries `measured: false` and a note saying the score does not compare images.

## Honesty contract

Every response from a generation route carries an `engine` block:

```json
{
  "engine": "mock",
  "is_mock": true,
  "cluster": "D3/D6",
  "reason": "No real video engine is active on this host.",
  "to_enable": "Nothing yet -- no real video adapter has been written...",
  "missing": ["no real engine adapter is implemented for this cluster"]
}
```

It is applied by `src/middleware/engine_labelling.py` rather than per-handler,
for two reasons. Sixty handlers each remembering to add a field means the one
that forgets is exactly the one that misleads someone. And a `response_model`
that does not declare an `engine` field silently drops one a handler added —
which had already happened to the QC endpoint, leaving it returning a bare
`passed` with no way to learn the artifact had never been opened. Middleware
runs after serialisation, so it survives that.

Error responses are deliberately **not** labelled. A 422 is not generated
output, and attaching an engine block would imply it was.

`ENGINE=real` on a cluster that cannot honour it raises `EngineUnavailable`
rather than falling back. A caller who asked for real output must not receive
synthetic output labelled as real.

## Running it

CI installs `requirements.txt` only, which is fastapi, pydantic, httpx, numpy
and pytest — no CUDA, no torch. Everything marked **real** above runs under
exactly that.

```bash
cd services/ai-api
pip install -r requirements.txt
pytest -q                      # 621 passed, 1 skipped
curl localhost:8000/ai/v1/capabilities
```

To provision a gated cluster, see `requirements-ml.txt`, which lists the
dependency block per cluster and repeats the caveat about adapters.

## Fact Check List

Assumptions that would break the above if wrong.

1. **`ffmpeg` is not a dependency of the QC path.** Loudness works on PCM WAV
   and frames on PNG using stdlib decoders written here. Anything else is
   reported unmeasurable. If a caller assumes MP4 audio is being measured, it
   is not — the response says `measured: false` with the reason.
2. **The BS.1770 K-weighting coefficients are exact only at 48 kHz.** They are
   used verbatim there. At other rates they are recomputed with an RBJ shelf
   parameterised by Q, while the standard specifies its shelf by slope; the two
   differ by ~0.4% in `b0`. `k_weighting_coefficients()` returns `exact=False`
   for those rates. A 44.1 kHz measurement may sit outside the ±0.1 LU the
   standard allows.
3. **`peak_is_sample_peak: true` means sample peak, not true peak.** True peak
   requires 4× oversampling, which is not implemented. R128's −1 dBTP ceiling
   is checked against sample peak, which under-reports inter-sample overs.
4. **The E6 descriptor is perceptual, not semantic.** It cannot tell that the
   same actor changed costume if the colours match, nor that two different
   actors are different people if they do not. It measures how alike two frames
   *look*. CLIP is the gated upgrade.
5. **E3 decomposition is lexicon-driven.** It handles the vocabulary in
   `scene_decomposition.py` and defaults everything else — reported honestly in
   `coverage.defaulted_fields`, but a prompt in another language or an unusual
   register will default nearly everything and still return a full structure.
6. **Remote artifacts are never fetched.** QC and continuity refuse `http(s)`
   URLs by design, since both run inside request handling. A deployment that
   stores output on S3 must stage it locally before anything can be measured.
   Every cloud-hosted artifact is currently `unmeasurable`.
7. **Six clusters are mock and no amount of provisioning changes that.**
   `real_implemented=False` in the registry is the source of truth, and
   `to_enable` says so. Anyone reading the `requirements-ml.txt` block for
   D3/D6 as an install-and-go recipe will be disappointed.
8. **`physics_service.py` and `mocap_service.py` were verified, not rewritten.**
   Neither contains a hash-seeded value; both are real CPU implementations. They
   are marked **real** on that basis, not on a fresh audit of their numerical
   correctness.
9. **The 621 test count is with `requirements.txt` only.** No test exercises a
   gated real engine, because no CI runner can. `real-gated` therefore means
   "the adapter exists and is unit-tested", not "verified end-to-end on a GPU".
