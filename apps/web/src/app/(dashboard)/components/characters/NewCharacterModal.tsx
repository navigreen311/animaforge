'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Loader } from 'lucide-react';

const STYLE_MODES = [
  { value: 'realistic', label: 'Realistic' },
  { value: 'anime', label: 'Anime' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'cel-shaded', label: 'Cel-shaded' },
  { value: 'pixel', label: 'Pixel' },
  { value: 'clay', label: 'Clay' },
] as const;

const NAME_MAX = 60;
const DESC_MAX = 200;

interface NewCharacterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NewCharacterModal({ open, onClose }: NewCharacterModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [styleMode, setStyleMode] = useState('realistic');
  const [isDigitalTwin, setIsDigitalTwin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
    } else {
      setName('');
      setDescription('');
      setStyleMode('realistic');
      setIsDigitalTwin(false);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      onClose();
    } catch {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-surface, var(--bg-primary))',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 440,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            New Character
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div>
          <label style={labelStyle}>Name *</label>
          <input
            ref={nameRef}
            type="text"
            placeholder="Character name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', float: 'right', marginTop: 2 }}>
            {name.length}/{NAME_MAX}
          </span>
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            placeholder="Brief description of the character"
            value={description}
            maxLength={DESC_MAX}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', float: 'right', marginTop: 2 }}>
            {description.length}/{DESC_MAX}
          </span>
        </div>

        <div>
          <label style={labelStyle}>Style</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STYLE_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setStyleMode(mode.value)}
                style={{
                  background: styleMode === mode.value ? 'var(--brand)' : 'var(--bg-hover)',
                  color: styleMode === mode.value ? '#ffffff' : 'var(--text-secondary)',
                  border:
                    styleMode === mode.value
                      ? '0.5px solid var(--brand)'
                      : '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={isDigitalTwin}
            onChange={(e) => setIsDigitalTwin(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          This is a digital twin (likeness-based character)
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '0.5px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '6px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: canSubmit ? 'var(--brand)' : 'var(--bg-hover)',
              color: canSubmit ? '#ffffff' : 'var(--text-tertiary)',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {submitting && <Loader size={12} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create Character'}
          </button>
        </div>
      </form>
    </div>
  );
}
