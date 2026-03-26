'use client';

import { useEffect, useState } from 'react';
import { X, Volume2, VolumeX, Upload } from 'lucide-react';
import { toast } from 'sonner';

/* ── Types ───────────────────────────────────────────────── */

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (voiceId: string, voiceName: string) => void;
}

/* ── Mock voices ─────────────────────────────────────────── */

const MOCK_VOICES = [
  { id: 'voice_1', name: 'Serene Female' },
  { id: 'voice_2', name: 'Bold Female' },
  { id: 'voice_3', name: 'Deep Male' },
  { id: 'voice_4', name: 'Young Male' },
] as const;

/* ── Component ───────────────────────────────────────────── */

export default function VoiceSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: VoiceSelectorModalProps) {
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  /* ── Escape key ──────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    setPreviewingId(null);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (voiceId: string, voiceName: string) => {
    onSelect(voiceId, voiceName);
    onClose();
  };

  const togglePreview = (voiceId: string) => {
    setPreviewingId((prev) => (prev === voiceId ? null : voiceId));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          width: 400,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Select Voice
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--text-primary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--text-tertiary)')
            }
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Voice List ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOCK_VOICES.map((voice) => {
            const isPreviewing = previewingId === voice.id;
            const SpeakerIcon = isPreviewing ? VolumeX : Volume2;

            return (
              <div
                key={voice.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 150ms',
                  cursor: 'default',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {/* Speaker icon */}
                <SpeakerIcon
                  size={18}
                  style={{
                    color: isPreviewing
                      ? 'var(--brand)'
                      : 'var(--text-tertiary)',
                    flexShrink: 0,
                  }}
                />

                {/* Voice name */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  {voice.name}
                </span>

                {/* Preview button */}
                <button
                  type="button"
                  onClick={() => togglePreview(voice.id)}
                  style={{
                    background: 'transparent',
                    border: '0.5px solid var(--border)',
                    color: isPreviewing
                      ? 'var(--brand)'
                      : 'var(--text-secondary)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--border-strong)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--border)')
                  }
                >
                  {isPreviewing ? 'Stop' : 'Preview'}
                </button>

                {/* Select button */}
                <button
                  type="button"
                  onClick={() => handleSelect(voice.id, voice.name)}
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'opacity 150ms',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = '0.85')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = '1')
                  }
                >
                  Select
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Upload voice sample ─────────────────────────── */}
        <div
          style={{
            marginTop: 12,
            borderTop: '0.5px solid var(--border)',
            paddingTop: 12,
          }}
        >
          <button
            type="button"
            onClick={() => toast.info('Coming soon')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'background 150ms, color 150ms',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <Upload size={16} />
            + Upload voice sample
          </button>
        </div>
      </div>
    </div>
  );
}
