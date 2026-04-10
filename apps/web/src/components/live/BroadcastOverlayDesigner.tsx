'use client';

import { useState } from 'react';
import {
  Layers,
  Bell,
  DollarSign,
  BarChart3,
  MessageCircle,
  Music,
  Save,
  Type,
} from 'lucide-react';

type AnimationIn = 'None' | 'Fade' | 'Slide' | 'Pop';
type Trigger = 'Manual' | 'Event' | 'Schedule';
type Position =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'mid-center' | 'mid-right'
  | 'bot-left' | 'bot-center' | 'bot-right';

interface OverlayTemplate {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  defaultPosition: Position;
}

interface OverlayInstance {
  id: string;
  templateId: string;
  position: Position;
  animationIn: AnimationIn;
  durationSec: number;
  trigger: Trigger;
}

const TEMPLATES: OverlayTemplate[] = [
  { id: 'lower-third', name: 'Lower third', icon: Type, defaultPosition: 'bot-left' },
  { id: 'sub-alert', name: 'Subscriber alert', icon: Bell, defaultPosition: 'top-center' },
  { id: 'donation', name: 'Donation popup', icon: DollarSign, defaultPosition: 'top-right' },
  { id: 'poll', name: 'Poll widget', icon: BarChart3, defaultPosition: 'mid-right' },
  { id: 'chat', name: 'Live chat overlay', icon: MessageCircle, defaultPosition: 'mid-left' },
  { id: 'now-playing', name: 'Now playing music', icon: Music, defaultPosition: 'bot-right' },
];

const POSITIONS: Position[] = [
  'top-left', 'top-center', 'top-right',
  'mid-left', 'mid-center', 'mid-right',
  'bot-left', 'bot-center', 'bot-right',
];

const POSITION_STYLE: Record<Position, React.CSSProperties> = {
  'top-left': { top: 12, left: 12 },
  'top-center': { top: 12, left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: 12, right: 12 },
  'mid-left': { top: '50%', left: 12, transform: 'translateY(-50%)' },
  'mid-center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  'mid-right': { top: '50%', right: 12, transform: 'translateY(-50%)' },
  'bot-left': { bottom: 12, left: 12 },
  'bot-center': { bottom: 12, left: '50%', transform: 'translateX(-50%)' },
  'bot-right': { bottom: 12, right: 12 },
};

export default function BroadcastOverlayDesigner() {
  const [instances, setInstances] = useState<OverlayInstance[]>([
    {
      id: 'i1',
      templateId: 'lower-third',
      position: 'bot-left',
      animationIn: 'Slide',
      durationSec: 5,
      trigger: 'Manual',
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>('i1');

  const selected = instances.find((i) => i.id === selectedId) ?? null;
  const selectedTemplate = selected ? TEMPLATES.find((t) => t.id === selected.templateId) : null;

  const addOverlay = (tpl: OverlayTemplate) => {
    const id = `i${Date.now()}`;
    const next: OverlayInstance = {
      id,
      templateId: tpl.id,
      position: tpl.defaultPosition,
      animationIn: 'Fade',
      durationSec: 5,
      trigger: 'Manual',
    };
    setInstances((prev) => [...prev, next]);
    setSelectedId(id);
  };

  const updateSelected = (patch: Partial<OverlayInstance>) => {
    if (!selected) return;
    setInstances((prev) => prev.map((i) => (i.id === selected.id ? { ...i, ...patch } : i)));
  };

  const saveSet = () => {
    // Mock: would persist set
    // eslint-disable-next-line no-console
    console.log('Saved overlay set', instances);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr 300px',
        gap: 16,
        height: 'calc(100vh - 200px)',
        minHeight: 560,
      }}
    >
      {/* Left: templates */}
      <aside
        style={{
          background: 'var(--surface, #0b0b10)',
          border: '1px solid var(--border, #262631)',
          borderRadius: 12,
          padding: 12,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Layers size={16} />
          <strong>Templates</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.id}
                onClick={() => addOverlay(tpl)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--card, #14141b)',
                  border: '1px solid var(--border, #262631)',
                  color: 'var(--fg, #e5e7eb)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                }}
              >
                <Icon size={14} />
                {tpl.name}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center: 16:9 preview */}
      <div
        style={{
          background: 'var(--surface, #0b0b10)',
          border: '1px solid var(--border, #262631)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div style={{ width: '100%', maxWidth: 800, aspectRatio: '16 / 9', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--border, #262631)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 12,
                color: '#f87171',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: '#ef4444',
                  display: 'inline-block',
                }}
              />
              LIVE PREVIEW 16:9
            </div>

            {instances.map((inst) => {
              const tpl = TEMPLATES.find((t) => t.id === inst.templateId)!;
              const Icon = tpl.icon;
              const isSel = inst.id === selectedId;
              return (
                <button
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  style={{
                    position: 'absolute',
                    ...POSITION_STYLE[inst.position],
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(20,20,27,0.85)',
                    color: '#fff',
                    border: `2px solid ${isSel ? 'var(--accent, #8b5cf6)' : 'rgba(255,255,255,0.2)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Icon size={12} />
                  {tpl.name}
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={saveSet}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--accent, #8b5cf6)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Save size={14} /> Save overlay set
        </button>
      </div>

      {/* Right: properties */}
      <aside
        style={{
          background: 'var(--surface, #0b0b10)',
          border: '1px solid var(--border, #262631)',
          borderRadius: 12,
          padding: 16,
          overflowY: 'auto',
        }}
      >
        <strong style={{ display: 'block', marginBottom: 12 }}>Properties</strong>
        {selected && selectedTemplate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
              {selectedTemplate.name}
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--muted, #9ca3af)', marginBottom: 6 }}>
                Position
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 4,
                  padding: 6,
                  background: 'var(--card, #14141b)',
                  border: '1px solid var(--border, #262631)',
                  borderRadius: 8,
                }}
              >
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => updateSelected({ position: p })}
                    aria-label={`Position ${p}`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 4,
                      background:
                        selected.position === p ? 'var(--accent, #8b5cf6)' : 'var(--surface2, #1f1f2a)',
                      border: '1px solid var(--border, #262631)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
              Animation in
              <select
                value={selected.animationIn}
                onChange={(e) => updateSelected({ animationIn: e.target.value as AnimationIn })}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--card, #14141b)',
                  border: '1px solid var(--border, #262631)',
                  color: 'var(--fg, #e5e7eb)',
                }}
              >
                <option value="None">None</option>
                <option value="Fade">Fade</option>
                <option value="Slide">Slide</option>
                <option value="Pop">Pop</option>
              </select>
            </label>

            <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
              Duration: {selected.durationSec}s
              <input
                type="range"
                min={1}
                max={10}
                value={selected.durationSec}
                onChange={(e) => updateSelected({ durationSec: Number(e.target.value) })}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>

            <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
              Trigger
              <select
                value={selected.trigger}
                onChange={(e) => updateSelected({ trigger: e.target.value as Trigger })}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--card, #14141b)',
                  border: '1px solid var(--border, #262631)',
                  color: 'var(--fg, #e5e7eb)',
                }}
              >
                <option value="Manual">Manual</option>
                <option value="Event">Event</option>
                <option value="Schedule">Schedule</option>
              </select>
            </label>
          </div>
        ) : (
          <p style={{ color: 'var(--muted, #9ca3af)', fontSize: 13 }}>
            Select an overlay from the preview or add one from the template list.
          </p>
        )}
      </aside>
    </div>
  );
}
