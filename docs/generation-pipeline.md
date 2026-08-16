# Generation pipeline

Eleven clusters, three honesty states, and exactly what a human must provision
to move each gated one to real.

`GET /ai/v1/capabilities` reports the same information for the host you are
actually on: which packages are importable, whether the weights directory
exists, and which engine a request would run with. **That endpoint is the
authority.** This document explains what it means and what to install.

---

## Status table

| Cluster | Name        | Status         | Env var              | What runs by default                      | To move to real                      |
| ------- | ----------- | -------------- | -------------------- | ----------------------------------------- | ------------------------------------ |
| E3      | scene_graph | **real**       | `SCENE_GRAPH_ENGINE` | Structured scene decomposition            | nothing                              |
| E8      | mocap       | **real**       | `MOCAP_ENGINE`       | Retargeting and IK on CPU                 | nothing                              |
| F5      | physics     | **real**       | `PHYSICS_ENGINE`     | Cloth, hair, rigid body, fluid            | nothing                              |
| G6      | qc          | **real**       | `QC_ENGINE`          | Temporal stability, EBU R128, A/V sync    | nothing                              |
| E6      | continuity  | **real**       | `CONTINUITY_ENGINE`  | Perceptual descriptor from pixels         | CLIP upgrade — see below             |
| D4      | audio       | **real**       | `AUDIO_ENGINE`       | ARPABET G2P + duration model for lip-sync | forced alignment — see below         |
| X6      | style       | **real**       | `STYLE_ENGINE`       | Palette/contrast/edges from pixels        | CLIP embedding — see below           |
| D3/D6   | video       | **real-gated** | `VIDEO_ENGINE`       | nothing; no URL returned                  | GPU + weights                        |
| F3      | music       | **real-gated** | `MUSIC_ENGINE`       | placeholder cue sheet, no audio           | checkpoint                           |
| D10     | training    | **real-gated** | `TRAINING_ENGINE`    | job recorded `not_implemented`            | GPU + base model                     |
| G2      | dubbing     | **mock**       | `DUBBING_ENGINE`     | nothing; no URL returned                  | **an adapter must be written first** |

**real** — runs a genuine implementation with nothing provisioned.
**real-gated** — a genuine implementation exists but needs weights, a GPU or a
binary. Mock until provisioned, and labelled mock in every response.
**mock** — no real implementation exists. Provisioning changes nothing;
`_ENGINE=real` fails loudly rather than pretending.

Two clusters are real by default _and_ have a gated upgrade. For those,
`real_engine_available` is always true — the default path needs nothing — so
use `engines.upgrade_available(name)` to ask whether the heavier path is
installed.

---

## Provisioning

### D4 audio — forced alignment

Default is real and needs nothing: rule-based grapheme-to-phoneme into ARPABET,
plus a segmental duration model with phrase-final and word-final lengthening.
`POST /ai/v1/audio/lip-sync` returns a phoneme timeline with Oculus visemes.

The upgrade measures word boundaries from a recording instead of modelling
them.

|          |                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| Packages | `torch`, `torchaudio`                                                                                              |
| Hardware | **CPU is fine.** Forced alignment is far cheaper than synthesis                                                    |
| Weights  | `AUDIO_WEIGHTS_DIR` — torchaudio downloads the `MMS_FA` bundle on first use, ~1.2 GB                               |
| Licence  | torchaudio BSD-2. **MMS_FA is derived from Meta's MMS, CC-BY-NC 4.0 — non-commercial.** Check this before shipping |
| Enable   | `pip install -r requirements-ml.txt`, set `AUDIO_ENGINE=real` and `AUDIO_WEIGHTS_DIR`                              |

**Speech synthesis is not implemented.** `POST /ai/v1/generate/audio` returns a
job with `is_mock: true` and no audio URL. There is no TTS adapter here and no
provisioning creates one.

### X6 style — CLIP embedding

Default is real and needs nothing: palette by k-means over decoded pixels, plus
saturation, contrast, edge density and colour temperature. Sources that cannot
be decoded report `measured: false` with a reason.

|          |                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------- |
| Packages | `torch`, `open_clip_torch`, `Pillow`                                                              |
| Hardware | **CPU is fine** for ViT-B/32 inference                                                            |
| Weights  | `STYLE_WEIGHTS_DIR`; `laion2b_s34b_b79k` is ~600 MB                                               |
| Licence  | open_clip MIT; LAION checkpoints MIT. Training data is web-scraped — review before commercial use |
| Enable   | `STYLE_ENGINE=real`, `STYLE_WEIGHTS_DIR`, optionally `STYLE_CLIP_MODEL` / `STYLE_CLIP_PRETRAINED` |

**Style transfer is not implemented.** It returns `status: "not_implemented"`
and no output URL.

**Only PNG decodes.** The decoder is the pure-Python reader in
`continuity_embedding`. JPEG and video are reported unmeasured rather than
guessed; adding Pillow to the base install would widen this, at the cost of a
dependency the CPU path does not otherwise need.

### D3/D6 video — diffusion

|            |                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Packages   | `torch`, `diffusers`, `transformers`, `accelerate`, `imageio-ffmpeg`, `Pillow`                                                                                                             |
| Hardware   | **NVIDIA GPU required.** Refuses on CPU rather than hanging for tens of minutes                                                                                                            |
| VRAM floor | **12 GB** for `text-to-video-ms-1.7b` at 16 frames with VAE slicing. **16 GB+** for Stable Video Diffusion image-to-video, even with model CPU offload                                     |
| Weights    | `VIDEO_WEIGHTS_DIR`. `damo-vilab/text-to-video-ms-1.7b` ~3.4 GB; `stabilityai/stable-video-diffusion-img2vid` ~9.6 GB                                                                      |
| Licence    | **SVD is under the Stability AI Non-Commercial Research Community License.** Commercial use needs a separate Stability agreement. ModelScope t2v is CC-BY-NC 4.0 — **also non-commercial** |
| Enable     | `VIDEO_ENGINE=real`, `VIDEO_WEIGHTS_DIR`, optionally `VIDEO_MODEL_ID` / `VIDEO_I2V_MODEL_ID`                                                                                               |

Unprovisioned, a job is queued with **no `preview_url`** and an `is_mock`
marker. Stages are reported `pending`, never completed.

### F3 music — MusicGen

|            |                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Packages   | `torch`, `audiocraft`                                                                                                 |
| Hardware   | `musicgen-small` runs on CPU at roughly real-time-times-ten. `medium`/`large` need a GPU                              |
| VRAM floor | **8 GB** for medium, **16 GB** for large                                                                              |
| Weights    | `MUSIC_WEIGHTS_DIR`. small ~1.5 GB, medium ~3.5 GB, large ~7 GB                                                       |
| Licence    | audiocraft code MIT. **MusicGen weights are CC-BY-NC 4.0 — non-commercial.** This is a hard blocker for shipped music |
| Enable     | `MUSIC_ENGINE=real`, `MUSIC_WEIGHTS_DIR`, optionally `MUSIC_MODEL_ID`                                                 |

Unprovisioned, `POST /ai/v1/music/score` returns a placeholder cue sheet marked
`is_mock`. It does **not** download or analyse `cut_url`, so its bpm, key and
duration are not measurements of that cut.

### D10 training — LoRA

|            |                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Packages   | `torch`, `diffusers`, `peft`, `safetensors`, `transformers`, `accelerate`, `Pillow`                                                    |
| Hardware   | **NVIDIA GPU required.** Refuses on CPU; CPU training is measured in days                                                              |
| VRAM floor | **12 GB** for SDXL LoRA at rank 8, batch 1, fp16                                                                                       |
| Weights    | `TRAINING_WEIGHTS_DIR` plus a base checkpoint. SDXL base ~6.9 GB                                                                       |
| Licence    | SDXL is under the **CreativeML Open RAIL++-M** licence — permissive commercially but carries use restrictions you must pass downstream |
| Enable     | `TRAINING_ENGINE=real`, `TRAINING_WEIGHTS_DIR`, optionally `TRAINING_BASE_MODEL`                                                       |

Only the UNet attention projections are adapted; text encoders and VAE stay
frozen, which is what keeps the adapter small and VRAM bounded.

### G2 dubbing — not implemented

No adapter exists. `DUBBING_ENGINE=real` will not produce one, and the registry
records `real_implemented=False` so the capability endpoint says so rather than
implying a download would help.

Translation, synthesis and lip-sync remux all return `is_mock` with **no
artifact URL**. The three `cdn.animaforge.ai` URLs these endpoints used to
return pointed at files nothing ever wrote.

The phoneme timing dubbing would build on (D4) is real. What is missing is a
voice model.

### E6 continuity — CLIP upgrade

Real by default via a perceptual descriptor over decoded pixels. Packages
`torch` + `open_clip_torch` and `CONTINUITY_WEIGHTS_DIR` enable semantic
similarity. Same licence position as X6.

---

## Dependency contract

`requirements.txt` must stay CPU-installable, because CI installs only that
file. Every heavy dependency lives in `requirements-ml.txt`, which CI never
installs.

Verified for this change with a fresh virtualenv:

```
$ pip install -r requirements.txt
$ python -c "import importlib.util as u; print(u.find_spec('torch'))"
None
```

`torch`, `torchaudio`, `diffusers`, `open_clip`, `audiocraft`, `peft` and `PIL`
are all absent after a clean install. The service imports, every cluster
probes, and the test suite runs **679 passed, 3 skipped** in that environment.

Every module that touches a heavy dependency imports it **inside the function**,
not at module scope, so importing a service never pulls torch in.

---

## Response contract

Every response from a cluster that did not do real work carries a
machine-readable marker:

```json
{
  "engine": "mock",
  "is_mock": true,
  "cluster": "D3/D6",
  "reason": "No video engine is active on this host.",
  "to_enable": "pip install -r requirements-ml.txt; set VIDEO_ENGINE=real; ...",
  "missing": ["torch", "diffusers", "VIDEO_WEIGHTS_DIR"]
}
```

A caller checks `is_mock`. It never has to parse prose or infer from a missing
field.

Real output carries the counterpart with `is_mock: false`.

---

## Fact Check List

Everything here needs a human decision, a download, or hardware. Nothing below
is provisioned by this branch.

### Licences that block commercial use

These are the ones that matter most, and three of the four gated clusters hit
one:

| Model                    | Cluster | Licence                                  | Effect                                                                          |
| ------------------------ | ------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| MusicGen weights         | F3      | **CC-BY-NC 4.0**                         | Generated music cannot ship commercially                                        |
| Stable Video Diffusion   | D3/D6   | **Stability Non-Commercial Research**    | Needs a separate Stability agreement                                            |
| ModelScope text-to-video | D3/D6   | **CC-BY-NC 4.0**                         | Same                                                                            |
| MMS_FA alignment bundle  | D4      | **CC-BY-NC 4.0** (derived from Meta MMS) | Blocks the _upgrade_; the default duration model is unaffected and unencumbered |
| SDXL base                | D10     | CreativeML Open RAIL++-M                 | Commercially usable, with use restrictions to pass downstream                   |
| open_clip / LAION        | X6, E6  | MIT                                      | Usable; training data is web-scraped, review separately                         |

The default real paths — D4 lip-sync timing, X6 pixel statistics, and E3, E8,
F5, G6, E6 — carry **no model licence at all**, because they use no models.

### Hardware

- **12 GB VRAM** minimum for video (text-to-video, 16 frames) and LoRA training.
- **16 GB+** for Stable Video Diffusion image-to-video.
- **8–16 GB** for MusicGen medium/large; small runs on CPU, slowly.
- CPU is sufficient for D4 forced alignment and X6 CLIP embedding.

### Unverified claims

- **The video, music and training adapters have never been executed.** No GPU
  in CI, none on the machine they were written on. They are written against the
  documented diffusers, audiocraft and peft APIs. Expect the first provisioned
  run to need adjustment.
- **D4 forced alignment has never been executed** either — same reason. The
  default duration-model path _is_ exercised, by 38 tests.
- **Rule-based G2P is 65–75% phoneme-accurate** on unrestricted English. The
  exception table covers the high-frequency irregular words. For lip-sync this
  matters less than it sounds, because visemes collapse many phoneme
  distinctions — but it is not a pronunciation dictionary and should not be
  used as one.
- **The duration model is typical English timing, not a speaker.** It models;
  the alignment upgrade measures.
- **X6 decodes PNG only.** Everything else is reported unmeasured. A pipeline
  feeding it JPEG frames will get honest nulls, not fingerprints.
- **The `_encode` width/height** in the video adapter reads `frames[0].size`,
  which assumes diffusers returns PIL images. If a future version returns numpy
  arrays the resolution field will read `0x0` — the clip itself is unaffected.
