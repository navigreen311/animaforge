'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Shot, AudioTrack } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineViewportProps {
  shots: Shot[];
  audioTracks: AudioTrack[];
  zoom: number;
  playing: boolean;
  selectedShotId: string | null;
  onSelectShot: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
  playheadPosition?: number;
  onPlayheadChange?: (position: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RULER_HEIGHT = 28;
const SHOT_TRACK_HEIGHT = 80;
const AUDIO_TRACK_HEIGHT = 56;
const TRACK_LABEL_WIDTH = 112;
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

const STATUS_COLORS: Record<string, string> = {
  draft: '#3f3f46',
  pending: '#a16207',
  approved: '#047857',
  rejected: '#b91c1c',
  generating: '#6d28d9',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  draft: '#52525b',
  pending: '#ca8a04',
  approved: '#059669',
  rejected: '#dc2626',
  generating: '#7c3aed',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pxPerSec(zoom: number): number {
  return (zoom / 100) * 80;
}

/* ------------------------------------------------------------------ */
/*  Draw functions                                                     */
/* ------------------------------------------------------------------ */

function drawGrid(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  scrollX: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const scale = pxPerSec(zoom);
  const startSec = Math.floor(scrollX / scale);
  const endSec = Math.ceil((scrollX + canvasWidth) / scale);
  ctx.strokeStyle = 'rgba(63, 63, 70, 0.3)';
  ctx.lineWidth = 1;
  for (let sec = startSec; sec <= endSec; sec++) {
    const x = Math.round(sec * scale - scrollX) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, RULER_HEIGHT);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
}

function drawTimeRuler(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  scrollX: number,
  canvasWidth: number,
) {
  const scale = pxPerSec(zoom);
  const startSec = Math.floor(scrollX / scale);
  const endSec = Math.ceil((scrollX + canvasWidth) / scale);
  // Ruler background
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, canvasWidth, RULER_HEIGHT);
  // Bottom border
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, RULER_HEIGHT - 0.5);
  ctx.lineTo(canvasWidth, RULER_HEIGHT - 0.5);
  ctx.stroke();
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  for (let sec = startSec; sec <= endSec; sec++) {
    const x = Math.round(sec * scale - scrollX);
    const isMajor = sec % 5 === 0;
    ctx.strokeStyle = isMajor ? '#52525b' : '#3f3f46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, isMajor ? 6 : 16);
    ctx.lineTo(x + 0.5, RULER_HEIGHT);
    ctx.stroke();
    // Labels every 5 seconds
    if (isMajor) {
      ctx.fillStyle = '#a1a1aa';
      const minutes = Math.floor(sec / 60);
      const secs = sec % 60;
      const label = minutes > 0
        ? minutes + ':' + secs.toString().padStart(2, '0')
        : sec + 's';
      ctx.fillText(label, x + 4, 14);
    }
  }
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  position: number,
  height: number,
  scrollX: number,
  zoom: number,
) {
  const scale = pxPerSec(zoom);
  const x = Math.round(position * scale - scrollX) + 0.5;
  // Red vertical line
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  // Triangle at top
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(x - 6, 0);
  ctx.lineTo(x + 6, 0);
  ctx.lineTo(x, 10);
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShotBlocks(
  ctx: CanvasRenderingContext2D,
  shots: Shot[],
  zoom: number,
  scrollX: number,
  selectedShotId: string | null,
) {
  const scale = pxPerSec(zoom);
  const y = RULER_HEIGHT;
  const height = SHOT_TRACK_HEIGHT;
  let offsetX = 0;
  // Track label
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, y, TRACK_LABEL_WIDTH, height);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Shots', 8, y + height / 2 + 4);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(TRACK_LABEL_WIDTH - 0.5, y);
  ctx.lineTo(TRACK_LABEL_WIDTH - 0.5, y + height);
  ctx.stroke();
  for (const shot of shots) {
    const widthPx = shot.durationSec * scale;
    const drawX = offsetX - scrollX + TRACK_LABEL_WIDTH;
    const isSelected = shot.id === selectedShotId;
    if (drawX + widthPx > TRACK_LABEL_WIDTH && drawX < ctx.canvas.width) {
      const rx = Math.max(drawX, TRACK_LABEL_WIDTH);
      const rw = Math.min(drawX + widthPx, ctx.canvas.width) - rx;
      // Colored rectangle per shot
      const bgColor = STATUS_COLORS[shot.status] || STATUS_COLORS.draft;
      ctx.fillStyle = bgColor;
      roundRect(ctx, rx + 1, y + 2, rw - 2, height - 4, 6);
      ctx.fill();
      // Border
      const borderColor = STATUS_BORDER_COLORS[shot.status] || STATUS_BORDER_COLORS.draft;
      ctx.strokeStyle = isSelected ? '#a78bfa' : borderColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      roundRect(ctx, rx + 1, y + 2, rw - 2, height - 4, 6);
      ctx.stroke();
      // Selection glow
      if (isSelected) {
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        roundRect(ctx, rx + 1, y + 2, rw - 2, height - 4, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // Thumbnail placeholder
      if (rw > 40) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        roundRect(ctx, rx + 6, y + 8, Math.min(rw - 12, 60), 32, 3);
        ctx.fill();
      }
      // Shot number label
      if (rw > 30) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('#' + shot.number, rx + 6, y + height - 10);
      }
      // Duration label
      if (rw > 60) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(shot.durationSec + 's', rx + rw - 6, y + height - 10);
      }
    }
    offsetX += widthPx;
  }
  // Bottom border
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y + height - 0.5);
  ctx.lineTo(ctx.canvas.width, y + height - 0.5);
  ctx.stroke();
}

function drawAudioWaveform(
  ctx: CanvasRenderingContext2D,
  track: AudioTrack,
  zoom: number,
  scrollX: number,
  trackIndex: number,
) {
  const scale = pxPerSec(zoom);
  const y = RULER_HEIGHT + SHOT_TRACK_HEIGHT + trackIndex * AUDIO_TRACK_HEIGHT;
  const height = AUDIO_TRACK_HEIGHT;
  const totalWidth = track.durationSec * scale;
  // Track label
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, y, TRACK_LABEL_WIDTH, height);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(track.label, 8, y + height / 2 + 4);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(TRACK_LABEL_WIDTH - 0.5, y);
  ctx.lineTo(TRACK_LABEL_WIDTH - 0.5, y + height);
  ctx.stroke();
  // Sine-wave style mock waveform
  const drawStartX = TRACK_LABEL_WIDTH;
  const waveformStartX = -scrollX + drawStartX;
  ctx.save();
  ctx.beginPath();
  ctx.rect(drawStartX, y, ctx.canvas.width - drawStartX, height);
  ctx.clip();
  const centerY = y + height / 2;
  const maxAmplitude = (height - 8) / 2;
  const samplesPerPixel = track.waveform.length / totalWidth;
  // Upper waveform
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px < totalWidth; px++) {
    const drawAtX = waveformStartX + px;
    if (drawAtX < drawStartX - 2 || drawAtX > ctx.canvas.width + 2) continue;
    const sampleIdx = Math.min(Math.floor(px * samplesPerPixel), track.waveform.length - 1);
    const amp = track.waveform[sampleIdx] ?? 0;
    const sineOffset = Math.sin(px * 0.15) * amp * maxAmplitude;
    const drawY = centerY + sineOffset;
    if (!started) { ctx.moveTo(drawAtX, drawY); started = true; }
    else { ctx.lineTo(drawAtX, drawY); }
  }
  ctx.stroke();
  // Mirror waveform
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
  ctx.beginPath();
  started = false;
  for (let px = 0; px < totalWidth; px++) {
    const drawAtX = waveformStartX + px;
    if (drawAtX < drawStartX - 2 || drawAtX > ctx.canvas.width + 2) continue;
    const sampleIdx = Math.min(Math.floor(px * samplesPerPixel), track.waveform.length - 1);
    const amp = track.waveform[sampleIdx] ?? 0;
    const sineOffset = Math.sin(px * 0.15) * amp * maxAmplitude;
    const drawY = centerY - sineOffset;
    if (!started) { ctx.moveTo(drawAtX, drawY); started = true; }
    else { ctx.lineTo(drawAtX, drawY); }
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y + height - 0.5);
  ctx.lineTo(ctx.canvas.width, y + height - 0.5);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/*  Hit-testing                                                        */
/* ------------------------------------------------------------------ */

function hitTestShot(
  x: number, y: number, shots: Shot[], zoom: number, scrollX: number,
): Shot | null {
  const scale = pxPerSec(zoom);
  if (y < RULER_HEIGHT || y > RULER_HEIGHT + SHOT_TRACK_HEIGHT) return null;
  if (x < TRACK_LABEL_WIDTH) return null;
  let offsetX = 0;
  for (const shot of shots) {
    const widthPx = shot.durationSec * scale;
    const drawX = offsetX - scrollX + TRACK_LABEL_WIDTH;
    if (x >= drawX && x <= drawX + widthPx) return shot;
    offsetX += widthPx;
  }
  return null;
}

function hitTestPlayhead(
  x: number, position: number, zoom: number, scrollX: number,
): boolean {
  const scale = pxPerSec(zoom);
  const playheadX = position * scale - scrollX;
  return Math.abs(x - playheadX) < 8;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelineViewport({
  shots,
  audioTracks,
  zoom,
  playing,
  selectedShotId,
  onSelectShot,
  onZoomChange,
  playheadPosition = 0,
  onPlayheadChange,
}: TimelineViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [scrollX, setScrollX] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const totalDuration = Math.max(
    shots.reduce((acc, s) => acc + s.durationSec, 0),
    ...audioTracks.map((t) => t.durationSec),
    30,
  );

  /* ---- Render loop (requestAnimationFrame for smooth 60fps) ---- */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, zoom, scrollX, width, height);
    drawTimeRuler(ctx, zoom, scrollX, width);
    drawShotBlocks(ctx, shots, zoom, scrollX, selectedShotId);
    audioTracks.forEach((track, i) => {
      drawAudioWaveform(ctx, track, zoom, scrollX, i);
    });
    drawPlayhead(ctx, playheadPosition, height, scrollX, zoom);
    ctx.restore();
    animFrameRef.current = requestAnimationFrame(render);
  }, [zoom, scrollX, shots, audioTracks, selectedShotId, playheadPosition]);

  /* ---- Start/stop render loop ---- */
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  /* ---- Handle resize via ResizeObserver ---- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          canvas.style.width = width + 'px';
          canvas.style.height = height + 'px';
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* ---- Mouse: click to select shot, drag playhead to scrub ---- */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (hitTestPlayhead(x, playheadPosition, zoom, scrollX)) {
        setIsDraggingPlayhead(true);
        return;
      }
      const hitShot = hitTestShot(x, y, shots, zoom, scrollX);
      if (hitShot) { onSelectShot(hitShot.id); return; }
      if (y < RULER_HEIGHT && onPlayheadChange) {
        const scale = pxPerSec(zoom);
        const timeSec = (x - TRACK_LABEL_WIDTH + scrollX) / scale;
        onPlayheadChange(Math.max(0, timeSec));
      }
    },
    [playheadPosition, zoom, scrollX, shots, onSelectShot, onPlayheadChange],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingPlayhead || !onPlayheadChange) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const scale = pxPerSec(zoom);
      const timeSec = (x - TRACK_LABEL_WIDTH + scrollX) / scale;
      onPlayheadChange(Math.max(0, Math.min(timeSec, totalDuration)));
    },
    [isDraggingPlayhead, zoom, scrollX, totalDuration, onPlayheadChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  /* ---- Scroll horizontally to pan, Ctrl+scroll to zoom ---- */
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.ctrlKey && onZoomChange) {
        const delta = e.deltaY > 0 ? -10 : 10;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
        onZoomChange(newZoom);
      } else {
        const maxScroll = Math.max(
          0,
          totalDuration * pxPerSec(zoom) - (canvasSize.width - TRACK_LABEL_WIDTH),
        );
        setScrollX((prev) =>
          Math.max(0, Math.min(prev + e.deltaY + e.deltaX, maxScroll)),
        );
      }
    },
    [zoom, onZoomChange, totalDuration, canvasSize.width],
  );

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-default"
        style={{ width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
