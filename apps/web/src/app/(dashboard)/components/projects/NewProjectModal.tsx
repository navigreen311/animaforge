'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Film, Clapperboard, Video, Layers, FileVideo, X, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';

/* ── Constants ──────────────────────────────────────────── */

const PROJECT_TYPES = [
  { value: 'Cartoon', label: 'Cartoon', icon: Film },
  { value: 'Animation', label: 'Animation', icon: Clapperboard },
  { value: 'Live-action', label: 'Live-action', icon: Video },
  { value: 'Mixed', label: 'Mixed', icon: Layers },
  { value: 'Documentary', label: 'Documentary', icon: FileVideo },
] as const;

const TEMPLATES = [
  { id: '30s-ad', label: '30s Ad', description: 'Quick advertisement spot' },
  { id: '2min-short', label: '2min Short', description: 'Short-form content' },
  { id: 'blank', label: 'Blank Canvas', description: 'Start from scratch' },
] as const;

const TITLE_MAX = 100;
const DESC_MAX = 200;

/* ── Component ──────────────────────────────────────────── */

export default function NewProjectModal() {
  const open = useUIStore((s) => s.newProjectModalOpen);
  const setOpen = useUIStore((s) => s.setNewProjectModalOpen);
  const router = useRouter();

  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<string>(PROJECT_TYPES[0].value);
  const [template, setTemplate] = useState<string>(TEMPLATES[2].id);
  const [submitting, setSubmitting] = useState(false);

  /* ── autofocus & escape ────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => titleRef.current?.focus());

    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, setOpen]);

  /* ── reset form when closed ────────────────────────── */
  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setProjectType(PROJECT_TYPES[0].value);
      setTemplate(TEMPLATES[2].id);
    }
  }, [open]);

  /* ── submit ────────────────────────────────────────── */
  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          projectType,
          template,
        }),
      });

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      const newId = data.id ?? data.projectId;

      toast.success('Project created');
      setOpen(false);
      router.push(`/projects/${newId}/timeline`);
    } catch {
      toast.error('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Enter submits (when not in textarea) ──────────── */
  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (
      e.key === 'Enter' &&
      (e.target as HTMLElement).tagName !== 'TEXTAREA' &&
      !submitting
    ) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!open) return null;

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
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          width: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
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
            New Project
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            disabled={submitting}
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
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Form ────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Title */}
          <FieldGroup label="Title" required>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="Enter project title"
              required
              maxLength={TITLE_MAX}
              disabled={submitting}
              style={inputStyle}
              onFocus={addFocusBorder}
              onBlur={removeFocusBorder}
            />
          </FieldGroup>

          {/* Description */}
          <FieldGroup label="Description" counter={`${description.length}/${DESC_MAX}`}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              placeholder="Brief description (optional)"
              rows={3}
              maxLength={DESC_MAX}
              disabled={submitting}
              style={{ ...inputStyle, height: 80, resize: 'none' }}
              onFocus={addFocusBorder}
              onBlur={removeFocusBorder}
            />
          </FieldGroup>

          {/* Project Type — visual card grid */}
          <FieldGroup label="Type">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}
            >
              {PROJECT_TYPES.map((t) => {
                const Icon = t.icon;
                const selected = projectType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    disabled={submitting}
                    onClick={() => setProjectType(t.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 4px',
                      borderRadius: 'var(--radius-md)',
                      border: selected
                        ? '1.5px solid var(--brand)'
                        : '0.5px solid var(--border)',
                      background: selected ? 'var(--brand-dim)' : 'var(--bg-surface)',
                      color: selected ? 'var(--brand)' : 'var(--text-secondary)',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      if (!selected)
                        e.currentTarget.style.borderColor = 'var(--border-strong)';
                    }}
                    onMouseLeave={(e) => {
                      if (!selected)
                        e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <Icon size={20} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          {/* Template */}
          <FieldGroup label="Template">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {TEMPLATES.map((t) => {
                const selected = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => setTemplate(t.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '14px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: selected
                        ? '1.5px solid var(--brand)'
                        : '0.5px solid var(--border)',
                      background: selected ? 'var(--brand-dim)' : 'var(--bg-surface)',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      if (!selected)
                        e.currentTarget.style.borderColor = 'var(--border-strong)';
                    }}
                    onMouseLeave={(e) => {
                      if (!selected)
                        e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: selected ? 'var(--brand)' : 'var(--text-primary)',
                      }}
                    >
                      {t.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {t.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              style={{
                background: 'transparent',
                border: '0.5px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background 150ms',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              style={{
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: !title.trim() || submitting ? 'not-allowed' : 'pointer',
                opacity: !title.trim() || submitting ? 0.5 : 1,
                transition: 'opacity 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '1';
              }}
            >
              {submitting && (
                <Loader
                  size={14}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              )}
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>

        {/* Spinner keyframe — injected once */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

/* ── Shared styles & helpers ──────────────────────────── */

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  transition: 'border-color 150ms',
  boxSizing: 'border-box',
};

function addFocusBorder(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-brand)';
}

function removeFocusBorder(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
}

function FieldGroup({
  label,
  required,
  counter,
  children,
}: {
  label: string;
  required?: boolean;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={labelStyle}>
          {label}
          {required && (
            <span style={{ color: 'var(--brand)', marginLeft: 2 }}>*</span>
          )}
        </span>
        {counter && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {counter}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
