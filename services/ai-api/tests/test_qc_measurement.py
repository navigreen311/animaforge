"""G6 -- real QC measurement.

The loudness cases check the implementation against signals whose correct
answer is known independently of this code: BS.1770 calibration points and
synthesised levels. That is the only way to tell a real measurement from a
convincing one.
"""

from __future__ import annotations

import wave

import numpy as np
import pytest

from src.services import qc_measurement as qm
from src.services.qc_service import validate_output

RATE = 48000


def sine(freq: float, seconds: float, amplitude: float, rate: int = RATE) -> np.ndarray:
    t = np.arange(int(rate * seconds)) / rate
    return amplitude * np.sin(2 * np.pi * freq * t)


class TestKWeighting:
    def test_uses_the_tabulated_coefficients_at_48k(self) -> None:
        (shelf_b, shelf_a), (_hpf_b, hpf_a), exact = qm.k_weighting_coefficients(48000)
        assert exact
        assert shelf_b[0] == pytest.approx(1.53512485958697)
        assert shelf_a[1] == pytest.approx(-1.69065929318241)
        assert hpf_a[2] == pytest.approx(0.99007225036621)

    def test_other_rates_are_recomputed_and_say_so(self) -> None:
        _shelf, _hpf, exact = qm.k_weighting_coefficients(44100)
        assert exact is False

    def test_bs1770_calibration_point(self) -> None:
        """A 1 kHz sine at 0 dBFS RMS reads ~0 LUFS.

        This is the property that pins the whole chain: the K-weighting gain at
        1 kHz (+0.69 dB) cancels the -0.691 offset in the loudness equation. If
        either the filter or the offset were wrong, this would not land on zero.
        """
        result = qm.measure_loudness(sine(1000, 5.0, np.sqrt(2)), RATE)
        assert result.measured
        assert result.value == pytest.approx(0.0, abs=0.05)

    def test_high_frequency_gets_the_shelf_boost(self) -> None:
        """K-weighting lifts treble ~4 dB; that is what makes it K-weighting."""
        low = qm.measure_loudness(sine(200, 3.0, 0.1), RATE).value
        high = qm.measure_loudness(sine(8000, 3.0, 0.1), RATE).value
        assert high - low == pytest.approx(4.0, abs=1.0)


class TestLoudness:
    @pytest.mark.parametrize("target", [-23.0, -33.0, -13.0])
    def test_levels_are_recovered(self, target: float) -> None:
        """Amplitude is placed so the correct answer is known in advance."""
        # +0.691 undoes the loudness offset; -0.6977 the K-weighting gain at
        # 1 kHz; sqrt(2) converts RMS to amplitude.
        amplitude = 10 ** ((target + 0.691 - 0.6977) / 20) * np.sqrt(2)
        result = qm.measure_loudness(sine(1000, 5.0, amplitude), RATE)
        assert result.value == pytest.approx(target, abs=0.1)

    def test_doubling_amplitude_adds_6db(self) -> None:
        quiet = qm.measure_loudness(sine(1000, 3.0, 0.1), RATE).value
        loud = qm.measure_loudness(sine(1000, 3.0, 0.2), RATE).value
        assert loud - quiet == pytest.approx(6.02, abs=0.05)

    def test_r128_compliance_flag(self) -> None:
        amplitude = 10 ** ((-23.0 + 0.691 - 0.6977) / 20) * np.sqrt(2)
        at_target = qm.measure_loudness(sine(1000, 5.0, amplitude), RATE)
        assert at_target.detail["compliant"] is True

        hot = qm.measure_loudness(sine(1000, 5.0, 0.9), RATE)
        assert hot.detail["compliant"] is False
        assert "target" in hot.detail["issue"]

    def test_silence_is_negative_infinity_not_a_score(self) -> None:
        result = qm.measure_loudness(np.zeros(RATE * 2), RATE)
        assert result.value == float("-inf")
        assert result.detail["compliant"] is False

    def test_stereo_is_summed_per_channel(self) -> None:
        mono = sine(1000, 3.0, 0.1)
        stereo = np.column_stack([mono, mono])
        # Two identical channels carry twice the power: +3.01 dB.
        assert (
            qm.measure_loudness(stereo, RATE).value
            - qm.measure_loudness(mono, RATE).value
        ) == pytest.approx(3.01, abs=0.05)

    def test_gating_ignores_silence_between_speech(self) -> None:
        """The relative gate is the point of BS.1770 over a plain RMS."""
        tone = sine(1000, 2.0, 0.2)
        padded = np.concatenate([tone, np.zeros(RATE * 8), tone])
        assert qm.measure_loudness(padded, RATE).value == pytest.approx(
            qm.measure_loudness(np.concatenate([tone, tone]), RATE).value, abs=0.5
        )

    def test_too_short_is_unmeasurable_not_zero(self) -> None:
        result = qm.measure_loudness(sine(1000, 0.05, 0.5), RATE)
        assert result.measured is False
        assert result.value is None
        assert "shorter than one" in result.reason

    def test_empty_input(self) -> None:
        assert qm.measure_loudness(np.array([]), RATE).measured is False

    def test_invalid_rate(self) -> None:
        assert qm.measure_loudness(sine(1000, 1.0, 0.1), 0).measured is False


class TestTemporalStability:
    def test_identical_frames_are_perfectly_stable(self) -> None:
        frames = np.tile(np.full((16, 16), 0.5), (10, 1, 1))
        result = qm.measure_temporal_stability(frames)
        assert result.value == pytest.approx(1.0)
        assert result.detail["flicker_detected"] is False

    def test_alternating_brightness_is_flicker(self) -> None:
        frames = np.array([
            np.full((16, 16), 0.4 if i % 2 else 0.6) for i in range(12)
        ])
        result = qm.measure_temporal_stability(frames)
        assert result.detail["flicker_detected"] is True
        assert result.detail["brightness_alternation_rate"] == pytest.approx(1.0)

    def test_smooth_fade_is_not_flicker(self) -> None:
        """A fade changes brightness every frame without alternating."""
        frames = np.array([np.full((16, 16), 0.2 + i * 0.05) for i in range(12)])
        result = qm.measure_temporal_stability(frames)
        assert result.detail["flicker_detected"] is False

    def test_motion_lowers_stability(self) -> None:
        static = np.tile(np.full((16, 16), 0.5), (8, 1, 1))
        moving = np.array([np.roll(np.eye(16), i, axis=1) for i in range(8)])
        assert (
            qm.measure_temporal_stability(moving).value
            < qm.measure_temporal_stability(static).value
        )

    def test_colour_frames_use_luma_not_channel_mean(self) -> None:
        """Equal-intensity red and green must read as a change, not as none."""
        red = np.zeros((8, 8, 3))
        red[..., 0] = 1.0
        green = np.zeros((8, 8, 3))
        green[..., 1] = 1.0
        frames = np.array([red, green] * 5)
        assert qm.measure_temporal_stability(frames).detail["mean_abs_diff"] > 0.1

    def test_single_frame_is_unmeasurable(self) -> None:
        result = qm.measure_temporal_stability(np.zeros((1, 8, 8)))
        assert result.measured is False
        assert "at least 2 frames" in result.reason

    def test_wrong_shape_is_unmeasurable(self) -> None:
        assert qm.measure_temporal_stability(np.zeros(10)).measured is False


class TestAVSync:
    def _burst_signal(self, offset_frames: int, fps: float = 24.0, n: int = 48):
        """Audio bursts and matching visual flashes, offset by *offset_frames*."""
        samples_per_frame = int(RATE / fps)
        audio = np.zeros(n * samples_per_frame)
        frames = np.zeros((n, 8, 8))
        for beat in range(6, n - 6, 8):
            start = beat * samples_per_frame
            audio[start : start + samples_per_frame] = np.random.RandomState(beat).randn(
                samples_per_frame
            )
            frames[beat + offset_frames] = 1.0
        return audio, frames, fps

    def test_aligned_signal_measures_near_zero(self) -> None:
        audio, frames, fps = self._burst_signal(0)
        result = qm.measure_av_sync(audio, RATE, frames, fps)
        assert result.measured
        assert abs(result.value) < 1000 / fps

    def test_offset_is_recovered_with_sign(self) -> None:
        """Video lagging audio by 3 frames must read as audio leading."""
        audio, frames, fps = self._burst_signal(3)
        result = qm.measure_av_sync(audio, RATE, frames, fps)
        assert result.value == pytest.approx(-3 / fps * 1000, abs=1000 / fps)

    def test_constant_signals_are_unmeasurable(self) -> None:
        result = qm.measure_av_sync(np.ones(RATE), RATE, np.ones((24, 8, 8)), 24.0)
        assert result.measured is False
        assert "constant" in result.reason

    def test_too_few_frames(self) -> None:
        assert qm.measure_av_sync(np.ones(RATE), RATE, np.ones((2, 8, 8)), 24.0).measured is False


class TestContainerInspection:
    def test_reads_a_real_wav_header(self, tmp_path) -> None:
        path = tmp_path / "tone.wav"
        _write_wav(path, sine(440, 0.5, 0.3))
        result = qm.inspect_container(str(path))
        assert result.measured
        assert result.value == "riff-wav"
        assert result.detail["valid"] is True

    def test_extension_mismatch_is_caught(self, tmp_path) -> None:
        """A renderer that died mid-write leaves exactly this."""
        path = tmp_path / "output.mp4"
        _write_wav(path, sine(440, 0.2, 0.3))
        result = qm.inspect_container(str(path))
        assert result.detail["valid"] is False
        assert "header says riff-wav" in result.detail["issue"]

    def test_empty_file(self, tmp_path) -> None:
        path = tmp_path / "empty.mp4"
        path.write_bytes(b"")
        result = qm.inspect_container(str(path))
        assert result.value == "empty"
        assert result.detail["valid"] is False

    def test_unrecognised_bytes(self, tmp_path) -> None:
        path = tmp_path / "junk.mp4"
        path.write_bytes(b"not a media file at all, just text")
        assert qm.inspect_container(str(path)).detail["valid"] is False

    def test_missing_file_is_unmeasurable(self, tmp_path) -> None:
        result = qm.inspect_container(str(tmp_path / "absent.mp4"))
        assert result.measured is False
        assert "not found" in result.reason


class TestArtifactResolution:
    def test_remote_urls_are_not_fetched(self) -> None:
        path, reason = qm.resolve_artifact("https://cdn.example.com/a.mp4")
        assert path is None
        assert "not fetched" in reason

    def test_empty_url(self) -> None:
        assert qm.resolve_artifact("")[0] is None

    def test_local_path(self, tmp_path) -> None:
        target = tmp_path / "a.wav"
        _write_wav(target, sine(440, 0.2, 0.2))
        assert qm.resolve_artifact(str(target))[0] == str(target)


class TestWavDecoding:
    @pytest.mark.parametrize("width", [2, 3, 4])
    def test_round_trips_at_each_bit_depth(self, tmp_path, width: int) -> None:
        signal = sine(1000, 1.0, 0.5)
        path = tmp_path / f"tone{width}.wav"
        _write_wav(path, signal, sample_width=width)

        decoded = qm.read_wav(str(path))
        assert decoded is not None
        samples, rate = decoded
        assert rate == RATE
        assert np.max(np.abs(samples[: signal.size] - signal)) < 0.01

    def test_loudness_of_a_decoded_file_matches_the_array(self, tmp_path) -> None:
        signal = sine(1000, 4.0, 0.25)
        path = tmp_path / "tone.wav"
        _write_wav(path, signal)
        samples, rate = qm.read_wav(str(path))
        assert qm.measure_loudness(samples, rate).value == pytest.approx(
            qm.measure_loudness(signal, RATE).value, abs=0.05
        )

    def test_non_wav_returns_none(self, tmp_path) -> None:
        path = tmp_path / "x.bin"
        path.write_bytes(b"\x00" * 64)
        assert qm.read_wav(str(path)) is None


class TestValidateOutputIntegration:
    def test_remote_artifact_yields_no_verdict(self) -> None:
        result = validate_output("https://cdn.example.com/o.mp4", ["loudness"])
        assert result["verdict"] == "unmeasurable"
        assert result["passed"] is False
        assert result["engine"]["is_mock"] is True
        assert result["report"]["scores_are_simulated"] is True

    def test_local_artifact_is_actually_measured(self, tmp_path) -> None:
        path = tmp_path / "out.wav"
        _write_wav(path, sine(1000, 4.0, 0.25))
        result = validate_output(str(path), ["loudness"])

        assert result["report"]["artifact_resolved"] is True
        assert result["engine"]["is_mock"] is False
        assert result["measurements"]["loudness"]["measured"] is True
        assert result["measurements"]["container"]["value"] == "riff-wav"
        assert result["verdict"] in {"pass", "fail"}

    def test_undecodable_video_says_why(self, tmp_path) -> None:
        path = tmp_path / "out.mp4"
        path.write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64)
        result = validate_output(str(path), ["loudness"])
        loudness = result["measurements"]["loudness"]
        assert loudness["measured"] is False
        assert "ffmpeg" in loudness["reason"]

    def test_legacy_check_names_still_resolve(self) -> None:
        result = validate_output("https://cdn.example.com/o.mp4", ["flicker", "identity"])
        assert not any("Unknown check" in issue for issue in result["issues"])
        assert set(result["details"]) == {"flicker", "identity"}


def _write_wav(path, signal: np.ndarray, sample_width: int = 2, rate: int = RATE) -> None:
    """Write float samples in [-1, 1] as a PCM WAV at the given bit depth."""
    if sample_width == 2:
        raw = (np.clip(signal, -1, 1) * 32767).astype("<i2").tobytes()
    elif sample_width == 4:
        raw = (np.clip(signal, -1, 1) * 2147483647).astype("<i4").tobytes()
    else:  # 24-bit: take the top three bytes of each int32
        packed = (np.clip(signal, -1, 1) * 8388607).astype("<i4")
        raw = np.frombuffer(packed.tobytes(), dtype=np.uint8).reshape(-1, 4)[:, :3].tobytes()

    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(sample_width)
        handle.setframerate(rate)
        handle.writeframes(raw)
