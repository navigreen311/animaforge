'use client';

import React from 'react';
import type { Vec3 } from './NodeProperties';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CameraKeyframe {
  id: string;
  time: number; // seconds
  position: Vec3;
  lookAt: Vec3;
  focalLength: number;
}

interface CameraPathProps {
  keyframes: CameraKeyframe[];
  selectedKeyframeId: string | null;
  onSelectKeyframe: (id: string) => void;
  /** Viewport dimensions used to project 3D to 2D for the overlay */
  width: number;
  height: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Simple isometric projection for the 2D overlay */
function project(pos: Vec3, w: number, h: number): { x: number; y: number } {
  const scale = 40;
  return {
    x: w / 2 + (pos.x - pos.z) * scale * 0.7,
    y: h / 2 - pos.y * scale + (pos.x + pos.z) * scale * 0.35,
  };
}

/** Build an SVG path string for a dotted camera movement path */
function buildPathD(keyframes: CameraKeyframe[], w: number, h: number): string {
  if (keyframes.length === 0) return '';
  const pts = keyframes.map((kf) => project(kf.position, w, h));
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Frustum at a keyframe                                              */
/* ------------------------------------------------------------------ */

function FrustumPreview({
  kf,
  w,
  h,
  selected,
  onSelect,
}: {
  kf: CameraKeyframe;
  w: number;
  h: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const center = project(kf.position, w, h);
  const lookAt2d = project(kf.lookAt, w, h);

  // Direction from camera to lookAt
  const dx = lookAt2d.x - center.x;
  const dy = lookAt2d.y - center.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // Frustum triangle proportional to focal length
  const fov = Math.max(10, 90 - kf.focalLength * 0.5);
  const fLen = 30;
  const halfSpread = Math.tan((fov * Math.PI) / 360) * fLen;

  const tip = center;
  const left = {
    x: center.x + nx * fLen - ny * halfSpread,
    y: center.y + ny * fLen + nx * halfSpread,
  };
  const right = {
    x: center.x + nx * fLen + ny * halfSpread,
    y: center.y + ny * fLen - nx * halfSpread,
  };

  return (
    <g className="cursor-pointer" onClick={onSelect}>
      {/* Frustum triangle */}
      <polygon
        points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
        fill={selected ? 'rgba(96,165,250,0.25)' : 'rgba(96,165,250,0.1)'}
        stroke={selected ? '#60a5fa' : 'rgba(96,165,250,0.4)'}
        strokeWidth={selected ? 1.5 : 1}
      />
      {/* Keyframe marker */}
      <circle
        cx={center.x}
        cy={center.y}
        r={selected ? 6 : 4}
        fill={selected ? '#60a5fa' : '#1e3a5f'}
        stroke="#60a5fa"
        strokeWidth={1.5}
      />
      {/* Time label */}
      <text
        x={center.x}
        y={center.y - 10}
        textAnchor="middle"
        className="text-[9px] fill-blue-300 select-none pointer-events-none"
      >
        {kf.time.toFixed(1)}s
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  CameraPath                                                         */
/* ------------------------------------------------------------------ */

export function CameraPath({
  keyframes,
  selectedKeyframeId,
  onSelectKeyframe,
  width,
  height,
}: CameraPathProps) {
  if (keyframes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
        No camera keyframes defined
      </div>
    );
  }

  const pathD = buildPathD(keyframes, width, height);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Dotted path line */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(96,165,250,0.5)"
        strokeWidth={2}
        strokeDasharray="6 4"
        strokeLinecap="round"
      />

      {/* Keyframe markers + frustums */}
      {keyframes.map((kf) => (
        <FrustumPreview
          key={kf.id}
          kf={kf}
          w={width}
          h={height}
          selected={kf.id === selectedKeyframeId}
          onSelect={() => onSelectKeyframe(kf.id)}
        />
      ))}
    </svg>
  );
}
