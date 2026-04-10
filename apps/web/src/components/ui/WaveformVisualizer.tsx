'use client';

/**
 * WaveformVisualizer (AU-2)
 *
 * Canvas-based 60-bar waveform visualizer.
 * - When `isPlaying`, samples live frequency data from the shared audioPlayer.
 * - When paused, draws `staticData` (or a deterministic fake pattern).
 * - Bars to the left of `progress` are drawn in `color`; right side is dimmed.
 */

import { useEffect, useRef } from 'react';
import { audioPlayer } from '@/lib/audioPlayer';

interface WaveformVisualizerProps {
  trackId: string;
  isPlaying: boolean;
  progress: number; // 0..1
  color: string;
  staticData?: number[]; // values in 0..1, any length
  height?: number;
}

const BAR_COUNT = 60;

/** Generate a stable pseudo-random static waveform pattern for a track. */
function generateFakeStatic(trackId: string): number[] {
  // Cheap string hash to seed a deterministic pattern.
  let seed = 0;
  for (let i = 0; i < trackId.length; i++) {
    seed = (seed * 31 + trackId.charCodeAt(i)) >>> 0;
  }
  const out: number[] = [];
  let s = seed || 1;
  for (let i = 0; i < BAR_COUNT; i++) {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const r = ((s >>> 0) % 1000) / 1000;
    // Shape it into a wave-ish envelope
    const env = 0.35 + 0.55 * Math.sin((i / BAR_COUNT) * Math.PI);
    out.push(Math.max(0.08, Math.min(1, r * env + 0.1)));
  }
  return out;
}

/** Resample an arbitrary 0..1 array to BAR_COUNT values. */
function resampleToBars(values: number[]): number[] {
  if (values.length === BAR_COUNT) return values;
  const out = new Array<number>(BAR_COUNT);
  if (values.length === 0) {
    for (let i = 0; i < BAR_COUNT; i++) out[i] = 0.1;
    return out;
  }
  for (let i = 0; i < BAR_COUNT; i++) {
    const idx = Math.floor((i / BAR_COUNT) * values.length);
    out[i] = values[idx] ?? 0.1;
  }
  return out;
}

/** Draw a rounded rectangle with graceful fallback for older canvases. */
function drawRoundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  const anyCtx = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
  };
  ctx.beginPath();
  if (typeof anyCtx.roundRect === 'function') {
    anyCtx.roundRect(x, y, w, Math.max(h, 0.5), radius);
  } else {
    const hh = Math.max(h, 0.5);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + hh - radius);
    ctx.quadraticCurveTo(x + w, y + hh, x + w - radius, y + hh);
    ctx.lineTo(x + radius, y + hh);
    ctx.quadraticCurveTo(x, y + hh, x, y + hh - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function WaveformVisualizer({
  trackId,
  isPlaying,
  progress,
  color,
  staticData,
  height = 28,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fallbackStaticRef = useRef<number[] | null>(null);

  if (!fallbackStaticRef.current || fallbackStaticRef.current.length !== BAR_COUNT) {
    fallbackStaticRef.current = generateFakeStatic(trackId);
  }

  useEffect(() => {
    fallbackStaticRef.current = generateFakeStatic(trackId);
  }, [trackId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width || canvas.clientWidth || 240;
      const cssHeight = height;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const dimColor = color + '55';

    const draw = () => {
      const cssWidth =
        canvas.getBoundingClientRect().width || canvas.clientWidth || canvas.width / dpr;
      const cssHeight = height;

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Decide data source.
      let bars: number[];
      if (isPlaying && audioPlayer.isPlaying(trackId)) {
        const freq = audioPlayer.getWaveformData();
        if (freq.length > 0) {
          const arr: number[] = new Array(BAR_COUNT);
          const step = freq.length / BAR_COUNT;
          for (let i = 0; i < BAR_COUNT; i++) {
            const start = Math.floor(i * step);
            const end = Math.max(start + 1, Math.floor((i + 1) * step));
            let sum = 0;
            let count = 0;
            for (let j = start; j < end && j < freq.length; j++) {
              sum += freq[j];
              count++;
            }
            const avg = count > 0 ? sum / count : 0;
            arr[i] = avg / 255;
          }
          bars = arr;
        } else {
          bars = resampleToBars(staticData ?? fallbackStaticRef.current ?? []);
        }
      } else {
        bars = resampleToBars(staticData ?? fallbackStaticRef.current ?? []);
      }

      const gap = 2;
      const totalGap = gap * (BAR_COUNT - 1);
      const barWidth = Math.max(1, (cssWidth - totalGap) / BAR_COUNT);
      const radius = Math.min(2, barWidth / 2);
      const progressBarIndex = Math.floor(
        Math.max(0, Math.min(1, progress)) * BAR_COUNT
      );

      for (let i = 0; i < BAR_COUNT; i++) {
        const v = Math.max(0.04, Math.min(1, bars[i] ?? 0.1));
        const barH = v * cssHeight;
        const x = i * (barWidth + gap);
        const y = (cssHeight - barH) / 2;
        ctx.fillStyle = i < progressBarIndex ? color : dimColor;
        drawRoundedBar(ctx, x, y, barWidth, barH, radius);
      }
    };

    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      draw();
    }

    const handleResize = () => {
      resize();
      draw();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [trackId, isPlaying, progress, color, staticData, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden="true"
    />
  );
}

export default WaveformVisualizer;
