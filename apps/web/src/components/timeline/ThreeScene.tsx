'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { WebGLRenderer as GLRenderer, hexToGL, type GLColor } from './WebGLRenderer';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ThreeSceneProps {
  shots: Array<{
    id: string;
    shotNumber: number;
    durationMs: number;
    status: string;
    sceneGraph: any;
  }>;
  playhead: number;
  zoom: number;
  selectedShotId: string | null;
  onShotClick: (id: string) => void;
  onPlayheadChange: (ms: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants (match TimelineViewport layout)                          */
/* ------------------------------------------------------------------ */

const RULER_HEIGHT = 28;
const SHOT_TRACK_HEIGHT = 80;
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

function msToSec(ms: number): number {
  return ms / 1000;
}

/* ------------------------------------------------------------------ */
/*  WebGL rendering functions                                          */
/* ------------------------------------------------------------------ */

function renderShotsWebGL(
  renderer: GLRenderer,
  shots: ThreeSceneProps['shots'],
  zoom: number,
  playheadMs: number,
  selectedId: string | null,
  scrollX: number,
  canvasW: number,
  canvasH: number,
) {
  const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
  const scale = pxPerSec(zoom) * dpr;
  const rulerH = RULER_HEIGHT * dpr;
  const shotH = SHOT_TRACK_HEIGHT * dpr;
  const labelW = TRACK_LABEL_WIDTH * dpr;
  const scrollPx = scrollX * dpr;

  renderer.clear([0.035, 0.035, 0.043, 1.0]);

  // Grid lines
  const startSec = Math.floor(scrollX / pxPerSec(zoom));
  const endSec = Math.ceil((scrollX + canvasW / dpr) / pxPerSec(zoom));
  const gridColor: GLColor = [0.247, 0.247, 0.275, 0.3];
  for (let sec = startSec; sec <= endSec; sec++) {
    const x = Math.round(sec * scale - scrollPx) + 0.5;
    renderer.drawLine(x, rulerH, x, canvasH, gridColor, 1);
  }

  // Time ruler background
  renderer.drawRect(0, 0, canvasW, rulerH, hexToGL('#18181b'));
  renderer.drawLine(0, rulerH, canvasW, rulerH, hexToGL('#27272a'), 1);

  // Ruler tick marks and labels
  for (let sec = startSec; sec <= endSec; sec++) {
    const x = Math.round(sec * scale - scrollPx);
    const isMajor = sec % 5 === 0;
    const tickColor = isMajor ? hexToGL('#52525b') : hexToGL('#3f3f46');
    const tickTop = isMajor ? 6 * dpr : 16 * dpr;
    renderer.drawLine(x, tickTop, x, rulerH, tickColor, 1);

    if (isMajor) {
      const minutes = Math.floor(sec / 60);
      const secs = sec % 60;
      const label = minutes > 0
        ? minutes + ':' + secs.toString().padStart(2, '0')
        : sec + 's';
      renderer.drawText(label, x + 4 * dpr, 3 * dpr, [0.631, 0.631, 0.667, 1.0], 10 * dpr);
    }
  }

  // Shot track label
  renderer.drawRect(0, rulerH, labelW, shotH, hexToGL('#18181b'));
  renderer.drawText('Shots', 8 * dpr, rulerH + shotH / 2 - 4 * dpr, [0.631, 0.631, 0.667, 1.0], 11 * dpr);
  renderer.drawLine(labelW, rulerH, labelW, rulerH + shotH, hexToGL('#27272a'), 1);

  // Shot blocks
  let offsetX = 0;
  for (const shot of shots) {
    const durationSec = msToSec(shot.durationMs);
    const widthPx = durationSec * scale;
    const drawX = offsetX - scrollPx + labelW;
    const isSelected = shot.id === selectedId;

    if (drawX + widthPx > labelW && drawX < canvasW) {
      const rx = Math.max(drawX, labelW);
      const rw = Math.min(drawX + widthPx, canvasW) - rx;

      const bgColor = STATUS_COLORS[shot.status] || STATUS_COLORS.draft;
      renderer.drawRect(rx + 1 * dpr, rulerH + 2 * dpr, rw - 2 * dpr, shotH - 4 * dpr, hexToGL(bgColor));

      const borderColor = isSelected ? '#a78bfa' : (STATUS_BORDER_COLORS[shot.status] || STATUS_BORDER_COLORS.draft);
      const borderWidth = isSelected ? 2 * dpr : 1;
      renderer.drawRectOutline(rx + 1 * dpr, rulerH + 2 * dpr, rw - 2 * dpr, shotH - 4 * dpr, hexToGL(borderColor), borderWidth);

      if (isSelected) {
        renderer.drawRectOutline(rx - 1 * dpr, rulerH, rw + 2 * dpr, shotH, hexToGL('#a78bfa', 0.4), 3 * dpr);
      }

      if (rw > 40 * dpr) {
        renderer.drawRect(rx + 6 * dpr, rulerH + 8 * dpr, Math.min(rw - 12 * dpr, 60 * dpr), 32 * dpr, [0, 0, 0, 0.2]);
      }

      if (rw > 30 * dpr) {
        renderer.drawText('#' + shot.shotNumber, rx + 6 * dpr, rulerH + shotH - 18 * dpr, [1, 1, 1, 0.9], 10 * dpr, 'left', true);
      }

      if (rw > 60 * dpr) {
        renderer.drawText(durationSec.toFixed(1) + 's', rx + rw - 6 * dpr, rulerH + shotH - 18 * dpr, [1, 1, 1, 0.6], 10 * dpr, 'right');
      }
    }
    offsetX += widthPx;
  }

  renderer.drawLine(0, rulerH + shotH, canvasW, rulerH + shotH, hexToGL('#27272a'), 1);

  // Playhead
  const playheadSec = msToSec(playheadMs);
  const phX = Math.round(playheadSec * scale - scrollPx);
  renderer.drawLine(phX, 0, phX, canvasH, [0.937, 0.267, 0.267, 1.0], 2 * dpr);
  renderer.drawRect(phX - 6 * dpr, 0, 12 * dpr, 10 * dpr, [0.937, 0.267, 0.267, 1.0]);
}

/* ------------------------------------------------------------------ */
/*  Canvas 2D fallback rendering                                       */
/* ------------------------------------------------------------------ */

function renderShots2D(
  ctx: CanvasRenderingContext2D,
  shots: ThreeSceneProps['shots'],
  zoom: number,
  playheadMs: number,
  selectedId: string | null,
  scrollX: number,
) {
  const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
  const w = ctx.canvas.width / dpr;
  const h = ctx.canvas.height / dpr;
  ctx.save();
  ctx.scale(dpr, dpr);

  const scale = pxPerSec(zoom);

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, w, h);

  const startSec = Math.floor(scrollX / scale);
  const endSec = Math.ceil((scrollX + w) / scale);
  ctx.strokeStyle = 'rgba(63, 63, 70, 0.3)';
  ctx.lineWidth = 1;
  for (let sec = startSec; sec <= endSec; sec++) {
    const x = Math.round(sec * scale - scrollX) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, RULER_HEIGHT);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, w, RULER_HEIGHT);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, RULER_HEIGHT - 0.5);
  ctx.lineTo(w, RULER_HEIGHT - 0.5);
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
    if (isMajor) {
      ctx.fillStyle = '#a1a1aa';
      const minutes = Math.floor(sec / 60);
      const secs = sec % 60;
      const label = minutes > 0 ? minutes + ':' + secs.toString().padStart(2, '0') : sec + 's';
      ctx.fillText(label, x + 4, 14);
    }
  }

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, RULER_HEIGHT, TRACK_LABEL_WIDTH, SHOT_TRACK_HEIGHT);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Shots', 8, RULER_HEIGHT + SHOT_TRACK_HEIGHT / 2 + 4);

  let offsetX = 0;
  for (const shot of shots) {
    const durationSec = msToSec(shot.durationMs);
    const widthPx = durationSec * scale;
    const drawX = offsetX - scrollX + TRACK_LABEL_WIDTH;
    const isSelected = shot.id === selectedId;

    if (drawX + widthPx > TRACK_LABEL_WIDTH && drawX < w) {
      const rx = Math.max(drawX, TRACK_LABEL_WIDTH);
      const rw = Math.min(drawX + widthPx, w) - rx;

      ctx.fillStyle = STATUS_COLORS[shot.status] || STATUS_COLORS.draft;
      ctx.fillRect(rx + 1, RULER_HEIGHT + 2, rw - 2, SHOT_TRACK_HEIGHT - 4);

      ctx.strokeStyle = isSelected ? '#a78bfa' : (STATUS_BORDER_COLORS[shot.status] || STATUS_BORDER_COLORS.draft);
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(rx + 1, RULER_HEIGHT + 2, rw - 2, SHOT_TRACK_HEIGHT - 4);

      if (isSelected) {
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx + 1, RULER_HEIGHT + 2, rw - 2, SHOT_TRACK_HEIGHT - 4);
        ctx.shadowBlur = 0;
      }

      if (rw > 40) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(rx + 6, RULER_HEIGHT + 8, Math.min(rw - 12, 60), 32);
      }

      if (rw > 30) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('#' + shot.shotNumber, rx + 6, RULER_HEIGHT + SHOT_TRACK_HEIGHT - 10);
      }

      if (rw > 60) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(durationSec.toFixed(1) + 's', rx + rw - 6, RULER_HEIGHT + SHOT_TRACK_HEIGHT - 10);
      }
    }
    offsetX += widthPx;
  }

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, RULER_HEIGHT + SHOT_TRACK_HEIGHT - 0.5);
  ctx.lineTo(w, RULER_HEIGHT + SHOT_TRACK_HEIGHT - 0.5);
  ctx.stroke();

  const playheadSec = msToSec(playheadMs);
  const phX = Math.round(playheadSec * scale - scrollX) + 0.5;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(phX, 0);
  ctx.lineTo(phX, h);
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(phX - 6, 0);
  ctx.lineTo(phX + 6, 0);
  ctx.lineTo(phX, 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Hit-testing helpers                                                */
/* ------------------------------------------------------------------ */

function hitTestShot(
  x: number,
  y: number,
  shots: ThreeSceneProps['shots'],
  zoom: number,
  scrollX: number,
): ThreeSceneProps['shots'][number] | null {
  const scale = pxPerSec(zoom);
  if (y < RULER_HEIGHT || y > RULER_HEIGHT + SHOT_TRACK_HEIGHT) return null;
  if (x < TRACK_LABEL_WIDTH) return null;
  let offsetX = 0;
  for (const shot of shots) {
    const durationSec = msToSec(shot.durationMs);
    const widthPx = durationSec * scale;
    const drawX = offsetX - scrollX + TRACK_LABEL_WIDTH;
    if (x >= drawX && x <= drawX + widthPx) return shot;
    offsetX += widthPx;
  }
  return null;
}

function hitTestPlayhead(
  x: number,
  playheadMs: number,
  zoom: number,
  scrollX: number,
): boolean {
  const scale = pxPerSec(zoom);
  const phX = msToSec(playheadMs) * scale - scrollX;
  return Math.abs(x - phX) < 8;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ThreeScene({
  shots,
  playhead,
  zoom,
  selectedShotId,
  onShotClick,
  onPlayheadChange,
}: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const rendererRef = useRef<GLRenderer | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [useWebGL, setUseWebGL] = useState(true);

  const totalDurationMs = Math.max(
    shots.reduce((acc, s) => acc + s.durationMs, 0),
    30_000,
  );

  const initGL = useCallback((canvas: HTMLCanvasElement): WebGL2RenderingContext | null => {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) {
      console.warn('WebGL2 not available, using Canvas 2D fallback');
      setUseWebGL(false);
      return null;
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return gl;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGL2RenderingContext | null = null;
    let renderer: GLRenderer | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    if (useWebGL) {
      gl = initGL(canvas);
      if (gl) {
        try {
          renderer = new GLRenderer(gl);
          rendererRef.current = renderer;
        } catch (err) {
          console.warn('WebGL renderer init failed, falling back to 2D:', err);
          gl = null;
          setUseWebGL(false);
        }
      }
    }

    if (!gl) {
      ctx = canvas.getContext('2d');
    }

    const render = () => {
      if (renderer && gl) {
        renderer.setViewport(canvas.width, canvas.height);
        renderShotsWebGL(renderer, shots, zoom, playhead, selectedShotId, scrollX, canvas.width, canvas.height);
      } else if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderShots2D(ctx, shots, zoom, playhead, selectedShotId, scrollX);
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      setCanvasSize({ width, height });
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    });
    observer.observe(canvas.parentElement || canvas);

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      if (renderer) {
        renderer.dispose();
        rendererRef.current = null;
      }
    };
  }, [shots, playhead, zoom, selectedShotId, scrollX, initGL, useWebGL]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (hitTestPlayhead(x, playhead, zoom, scrollX)) {
        setIsDraggingPlayhead(true);
        return;
      }

      const hitShot = hitTestShot(x, y, shots, zoom, scrollX);
      if (hitShot) {
        onShotClick(hitShot.id);
        return;
      }

      if (y < RULER_HEIGHT) {
        const scale = pxPerSec(zoom);
        const timeSec = (x - TRACK_LABEL_WIDTH + scrollX) / scale;
        onPlayheadChange(Math.max(0, timeSec * 1000));
      }
    },
    [playhead, zoom, scrollX, shots, onShotClick, onPlayheadChange],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingPlayhead) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const scale = pxPerSec(zoom);
      const timeSec = (x - TRACK_LABEL_WIDTH + scrollX) / scale;
      onPlayheadChange(Math.max(0, Math.min(timeSec * 1000, totalDurationMs)));
    },
    [isDraggingPlayhead, zoom, scrollX, totalDurationMs, onPlayheadChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!e.ctrlKey) {
        const maxScroll = Math.max(
          0,
          msToSec(totalDurationMs) * pxPerSec(zoom) - (canvasSize.width - TRACK_LABEL_WIDTH),
        );
        setScrollX((prev) =>
          Math.max(0, Math.min(prev + e.deltaY + e.deltaX, maxScroll)),
        );
      }
    },
    [zoom, totalDurationMs, canvasSize.width],
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
