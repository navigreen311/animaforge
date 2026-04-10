'use client';

import { useState } from 'react';
import { Plus, GitBranch, Smile, User, Zap, X } from 'lucide-react';

interface SceneNode {
  id: string;
  name: string;
  x: number;
  y: number;
  tone: 'neutral' | 'tense' | 'joyful' | 'somber' | 'hopeful';
  pose: string;
  emotion: string;
  trigger: 'audience vote' | 'timer' | 'keyword detected';
}

interface Connection {
  from: string;
  to: string;
}

const INITIAL_SCENES: SceneNode[] = [
  { id: 's1', name: 'Opening', x: 60, y: 60, tone: 'neutral', pose: 'idle', emotion: 'calm', trigger: 'timer' },
  { id: 's2', name: 'Crisis', x: 340, y: 60, tone: 'tense', pose: 'alert', emotion: 'worried', trigger: 'keyword detected' },
  { id: 's3', name: 'Resolution Path A', x: 620, y: 0, tone: 'hopeful', pose: 'confident', emotion: 'determined', trigger: 'audience vote' },
  { id: 's4', name: 'Resolution Path B', x: 620, y: 140, tone: 'somber', pose: 'slumped', emotion: 'resigned', trigger: 'audience vote' },
  { id: 's5', name: 'Outro', x: 900, y: 60, tone: 'joyful', pose: 'wave', emotion: 'grateful', trigger: 'timer' },
];

const INITIAL_CONNECTIONS: Connection[] = [
  { from: 's1', to: 's2' },
  { from: 's2', to: 's3' },
  { from: 's2', to: 's4' },
  { from: 's3', to: 's5' },
  { from: 's4', to: 's5' },
];

const TONE_COLORS: Record<SceneNode['tone'], string> = {
  neutral: 'var(--muted, #6b7280)',
  tense: '#dc2626',
  joyful: '#f59e0b',
  somber: '#4338ca',
  hopeful: '#10b981',
};

const NODE_W = 200;
const NODE_H = 100;

export default function BranchingNarrativeEditor() {
  const [scenes, setScenes] = useState<SceneNode[]>(INITIAL_SCENES);
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [selectedId, setSelectedId] = useState<string | null>('s1');

  const selected = scenes.find((s) => s.id === selectedId) ?? null;

  const updateSelected = (patch: Partial<SceneNode>) => {
    if (!selected) return;
    setScenes((prev) => prev.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
  };

  const addScene = () => {
    const id = `s${Date.now()}`;
    const next: SceneNode = {
      id,
      name: 'New Scene',
      x: 60 + Math.random() * 600,
      y: 260 + Math.random() * 80,
      tone: 'neutral',
      pose: 'idle',
      emotion: 'calm',
      trigger: 'timer',
    };
    setScenes((prev) => [...prev, next]);
    setSelectedId(id);
  };

  const getAnchor = (id: string, side: 'out' | 'in') => {
    const s = scenes.find((x) => x.id === id)!;
    return { x: s.x + (side === 'out' ? NODE_W : 0), y: s.y + NODE_H / 2 };
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 16,
        height: 'calc(100vh - 200px)',
        minHeight: 560,
      }}
    >
      {/* Canvas */}
      <div
        style={{
          position: 'relative',
          background: 'var(--surface, #0b0b10)',
          border: '1px solid var(--border, #262631)',
          borderRadius: 12,
          overflow: 'auto',
        }}
      >
        <div style={{ position: 'relative', width: 1200, height: 560 }}>
          <svg
            width={1200}
            height={560}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent, #8b5cf6)" />
              </marker>
            </defs>
            {connections.map((c, i) => {
              const a = getAnchor(c.from, 'out');
              const b = getAnchor(c.to, 'in');
              const mx = (a.x + b.x) / 2;
              const path = `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
              return (
                <path
                  key={i}
                  d={path}
                  stroke="var(--accent, #8b5cf6)"
                  strokeWidth={2}
                  fill="none"
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </svg>

          {scenes.map((s) => {
            const isSelected = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{
                  position: 'absolute',
                  left: s.x,
                  top: s.y,
                  width: NODE_W,
                  height: NODE_H,
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? 'var(--accent, #8b5cf6)' : 'var(--border, #262631)'}`,
                  background: 'var(--card, #14141b)',
                  color: 'var(--fg, #e5e7eb)',
                  padding: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 0 4px rgba(139,92,246,0.15)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{s.name}</strong>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: TONE_COLORS[s.tone],
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {s.tone}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    color: 'var(--muted, #9ca3af)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--surface2, #1f1f2a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Avatar pose preview"
                  >
                    <User size={16} />
                  </div>
                  <div>
                    <div>pose: {s.pose}</div>
                    <div>emo: {s.emotion}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={addScene}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            borderRadius: 999,
            background: 'var(--accent, #8b5cf6)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(139,92,246,0.35)',
          }}
        >
          <Plus size={16} /> Add Scene
        </button>
      </div>

      {/* Edit panel */}
      <aside
        style={{
          background: 'var(--surface, #0b0b10)',
          border: '1px solid var(--border, #262631)',
          borderRadius: 12,
          padding: 16,
          overflowY: 'auto',
        }}
      >
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={16} />
              <strong>Edit Scene</strong>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted, #9ca3af)',
                  cursor: 'pointer',
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
              Scene name
              <input
                type="text"
                value={selected.name}
                onChange={(e) => updateSelected({ name: e.target.value })}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--card, #14141b)',
                  border: '1px solid var(--border, #262631)',
                  color: 'var(--fg, #e5e7eb)',
                }}
              />
            </label>

            <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
              <Zap size={12} style={{ display: 'inline', marginRight: 4 }} />
              Trigger condition
              <select
                value={selected.trigger}
                onChange={(e) => updateSelected({ trigger: e.target.value as SceneNode['trigger'] })}
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
                <option value="audience vote">audience vote</option>
                <option value="timer">timer</option>
                <option value="keyword detected">keyword detected</option>
              </select>
            </label>

            <fieldset style={{ border: '1px solid var(--border, #262631)', borderRadius: 8, padding: 10 }}>
              <legend style={{ fontSize: 12, color: 'var(--muted, #9ca3af)', padding: '0 6px' }}>
                <Smile size={12} style={{ display: 'inline', marginRight: 4 }} />
                Avatar response
              </legend>
              <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
                Emotion
                <input
                  type="text"
                  value={selected.emotion}
                  onChange={(e) => updateSelected({ emotion: e.target.value })}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: 'var(--card, #14141b)',
                    border: '1px solid var(--border, #262631)',
                    color: 'var(--fg, #e5e7eb)',
                  }}
                />
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)', marginTop: 8, display: 'block' }}>
                Pose
                <input
                  type="text"
                  value={selected.pose}
                  onChange={(e) => updateSelected({ pose: e.target.value })}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: 'var(--card, #14141b)',
                    border: '1px solid var(--border, #262631)',
                    color: 'var(--fg, #e5e7eb)',
                  }}
                />
              </label>
            </fieldset>

            <label style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
              Emotional tone
              <select
                value={selected.tone}
                onChange={(e) => updateSelected({ tone: e.target.value as SceneNode['tone'] })}
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
                <option value="neutral">neutral</option>
                <option value="tense">tense</option>
                <option value="joyful">joyful</option>
                <option value="somber">somber</option>
                <option value="hopeful">hopeful</option>
              </select>
            </label>
          </div>
        ) : (
          <p style={{ color: 'var(--muted, #9ca3af)', fontSize: 13 }}>
            Select a scene node to edit its properties.
          </p>
        )}
      </aside>
    </div>
  );
}
