'use client';

import React, { useCallback, useRef } from 'react';
import type { NodeKind } from './NodeTree';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TransformData {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface CameraProps {
  focalLength: number;
  angle: number;
  movementType: 'static' | 'pan' | 'dolly' | 'crane' | 'handheld';
}

export interface CharacterProps {
  expression: string;
  pose: string;
  action: string;
}

export interface LightProps {
  type: 'key' | 'fill' | 'back';
  intensity: number;
  color: string;
}

export interface NodeData {
  id: string;
  name: string;
  kind: NodeKind;
  transform: TransformData;
  camera?: CameraProps;
  character?: CharacterProps;
  light?: LightProps;
}

interface NodePropertiesProps {
  node: NodeData | null;
  onChange: (id: string, patch: Partial<NodeData>) => void;
}

/* ------------------------------------------------------------------ */
/*  DragNumber – number input with drag-to-adjust                     */
/* ------------------------------------------------------------------ */

function DragNumber({
  label,
  value,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      dragging.current = true;
      startY.current = e.clientY;
      startVal.current = value;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) * step;
      onChange(parseFloat((startVal.current + delta).toFixed(3)));
    },
    [step, onChange],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="flex items-center gap-1">
      <span
        className="text-[10px] font-bold text-zinc-500 uppercase w-3 cursor-ns-resize select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white w-16 focus:border-purple-500 outline-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vec3 Editor                                                        */
/* ------------------------------------------------------------------ */

function Vec3Editor({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: Vec3;
  step?: number;
  onChange: (v: Vec3) => void;
}) {
  return (
    <Section title={label}>
      <div className="flex gap-2">
        <DragNumber label="X" value={value.x} step={step} onChange={(x) => onChange({ ...value, x })} />
        <DragNumber label="Y" value={value.y} step={step} onChange={(y) => onChange({ ...value, y })} />
        <DragNumber label="Z" value={value.z} step={step} onChange={(z) => onChange({ ...value, z })} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  NodeProperties                                                     */
/* ------------------------------------------------------------------ */

export function NodeProperties({ node, onChange }: NodePropertiesProps) {
  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        Select a node to inspect
      </div>
    );
  }

  const patch = (p: Partial<NodeData>) => onChange(node.id, p);

  const updateTransform = (key: keyof TransformData, v: Vec3) =>
    patch({ transform: { ...node.transform, [key]: v } });

  return (
    <div className="p-3 overflow-y-auto h-full text-sm">
      {/* Name */}
      <Section title="General">
        <input
          value={node.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-xs w-full focus:border-purple-500 outline-none mb-1"
        />
        <span className="text-[10px] text-zinc-500 uppercase">{node.kind}</span>
      </Section>

      {/* Transform */}
      <Vec3Editor label="Position" value={node.transform.position} step={0.1} onChange={(v) => updateTransform('position', v)} />
      <Vec3Editor label="Rotation" value={node.transform.rotation} step={1} onChange={(v) => updateTransform('rotation', v)} />
      <Vec3Editor label="Scale" value={node.transform.scale} step={0.05} onChange={(v) => updateTransform('scale', v)} />

      {/* Camera */}
      {node.kind === 'camera' && node.camera && (
        <Section title="Camera">
          <div className="space-y-2">
            <DragNumber
              label="FL"
              value={node.camera.focalLength}
              step={1}
              onChange={(focalLength) => patch({ camera: { ...node.camera!, focalLength } })}
            />
            <DragNumber
              label="\u2220"
              value={node.camera.angle}
              step={1}
              onChange={(angle) => patch({ camera: { ...node.camera!, angle } })}
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Move</span>
              <select
                value={node.camera.movementType}
                onChange={(e) =>
                  patch({ camera: { ...node.camera!, movementType: e.target.value as CameraProps['movementType'] } })
                }
                className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white focus:border-purple-500 outline-none"
              >
                {['static', 'pan', 'dolly', 'crane', 'handheld'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>
      )}

      {/* Character */}
      {node.kind === 'character' && node.character && (
        <Section title="Character">
          <div className="space-y-2">
            {(['expression', 'pose', 'action'] as const).map((field) => (
              <div key={field} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase w-12">{field}</span>
                <input
                  value={node.character![field]}
                  onChange={(e) => patch({ character: { ...node.character!, [field]: e.target.value } })}
                  className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white flex-1 focus:border-purple-500 outline-none"
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Light */}
      {node.kind === 'light' && node.light && (
        <Section title="Light">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase w-12">Type</span>
              <select
                value={node.light.type}
                onChange={(e) =>
                  patch({ light: { ...node.light!, type: e.target.value as LightProps['type'] } })
                }
                className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white focus:border-purple-500 outline-none"
              >
                {['key', 'fill', 'back'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <DragNumber
              label="Int"
              value={node.light.intensity}
              step={0.05}
              onChange={(intensity) => patch({ light: { ...node.light!, intensity } })}
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase w-12">Color</span>
              <input
                type="color"
                value={node.light.color}
                onChange={(e) => patch({ light: { ...node.light!, color: e.target.value } })}
                className="w-8 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="text-xs text-zinc-400">{node.light.color}</span>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
