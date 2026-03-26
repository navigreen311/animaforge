'use client';

import { Upload, User, Check, Loader } from 'lucide-react';

// ── Pipeline Steps ───────────────────────────────────────────
type StepStatus = 'completed' | 'in-progress' | 'pending';

interface PipelineStep {
  id: number;
  label: string;
  status: StepStatus;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: 1, label: 'Upload', status: 'completed' },
  { id: 2, label: 'Detect', status: 'completed' },
  { id: 3, label: 'Reconstruct', status: 'completed' },
  { id: 4, label: 'Rig', status: 'completed' },
  { id: 5, label: 'Texture', status: 'in-progress' },
  { id: 6, label: 'Animate', status: 'pending' },
  { id: 7, label: 'Export', status: 'pending' },
];

// ── Avatar Properties ────────────────────────────────────────
interface AvatarProperty {
  label: string;
  value: string;
}

const AVATAR_PROPERTIES: AvatarProperty[] = [
  { label: 'Name', value: 'Kai Digital Twin' },
  { label: 'Poly Count', value: '45,200' },
  { label: 'Texture Res', value: '4096x4096' },
  { label: 'Rig Type', value: 'Full Body IK' },
  { label: 'Blend Shapes', value: '52' },
  { label: 'Status', value: 'Texturing...' },
];

// ── Sample Avatars ───────────────────────────────────────────
type AvatarStatus = 'complete' | 'draft';

interface AvatarCard {
  id: string;
  name: string;
  status: AvatarStatus;
  gradient: string;
}

const SAMPLE_AVATARS: AvatarCard[] = [
  {
    id: 'avatar-1',
    name: 'Luna Avatar',
    status: 'complete',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
  },
  {
    id: 'avatar-2',
    name: 'Dr. Echo Avatar',
    status: 'draft',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  },
];

// ── Helpers ──────────────────────────────────────────────────
function stepColor(status: StepStatus): string {
  if (status === 'completed') return '#22c55e';
  if (status === 'in-progress') return '#eab308';
  return '#4b5563';
}

function stepBorder(status: StepStatus): string {
  if (status === 'completed') return '#22c55e';
  if (status === 'in-progress') return '#eab308';
  return '#374151';
}

function lineColor(fromStatus: StepStatus): string {
  if (fromStatus === 'completed') return '#22c55e';
  return '#374151';
}

// ── Component ────────────────────────────────────────────────
export default function AvatarStudioPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Avatar Studio
          </h1>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              margin: '4px 0 0',
            }}
          >
            Create photorealistic digital humans
          </p>
        </div>

        {/* ── Pipeline Progress ─────────────────────────── */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {PIPELINE_STEPS.map((step, index) => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  flex: 1,
                }}
              >
                {/* Connecting line (not on last step) */}
                {index < PIPELINE_STEPS.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 11,
                      left: '50%',
                      width: '100%',
                      height: 2,
                      background: lineColor(step.status),
                      zIndex: 0,
                    }}
                  />
                )}

                {/* Step circle */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background:
                      step.status === 'completed'
                        ? stepColor(step.status)
                        : 'var(--bg-surface)',
                    border: `2px solid ${stepBorder(step.status)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    color:
                      step.status === 'completed'
                        ? '#ffffff'
                        : step.status === 'in-progress'
                          ? '#eab308'
                          : '#6b7280',
                    zIndex: 1,
                    position: 'relative',
                    animation:
                      step.status === 'in-progress'
                        ? 'pulse 2s ease-in-out infinite'
                        : undefined,
                  }}
                >
                  {step.status === 'completed' ? (
                    <Check size={11} strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step label */}
                <span
                  style={{
                    fontSize: 10,
                    color:
                      step.status === 'completed'
                        ? '#22c55e'
                        : step.status === 'in-progress'
                          ? '#eab308'
                          : 'var(--text-tertiary)',
                    marginTop: 6,
                    fontWeight: step.status === 'in-progress' ? 600 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Area (Preview + Properties) ──────────── */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Left: Preview */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-xl)',
                height: 300,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <User size={40} style={{ color: 'var(--text-tertiary)' }} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              >
                3D Avatar Preview
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}
              >
                Processing texture maps...
              </span>
              <Loader
                size={16}
                style={{
                  color: '#eab308',
                  animation: 'spin 1.5s linear infinite',
                }}
              />
            </div>
          </div>

          {/* Right: Properties Panel */}
          <div
            style={{
              width: 280,
              flexShrink: 0,
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '16px',
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 12px',
              }}
            >
              Avatar Properties
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {AVATAR_PROPERTIES.map((prop, index) => (
                <div
                  key={prop.label}
                  style={{
                    padding: '10px 0',
                    borderTop:
                      index > 0 ? '0.5px solid var(--border)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {prop.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {prop.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom: Completed Avatar Cards ────────────── */}
        <div>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 10px',
            }}
          >
            Recent Avatars
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {SAMPLE_AVATARS.map((avatar) => (
              <div
                key={avatar.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease',
                }}
              >
                {/* Gradient top area */}
                <div
                  style={{
                    height: 80,
                    background: avatar.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={28} style={{ color: 'rgba(255,255,255,0.6)' }} />
                </div>

                {/* Card body */}
                <div
                  style={{
                    padding: '10px 14px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {avatar.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color:
                        avatar.status === 'complete' ? '#22c55e' : '#eab308',
                      background:
                        avatar.status === 'complete'
                          ? 'rgba(34,197,94,0.1)'
                          : 'rgba(234,179,8,0.1)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {avatar.status === 'complete' ? 'Complete' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
          50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(234, 179, 8, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
