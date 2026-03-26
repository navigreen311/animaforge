'use client';

import { useCallback } from 'react';
import { Clapperboard, Film, FileText } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface Template {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const TEMPLATES: Template[] = [
  {
    id: '30s-cartoon-ad',
    title: '30s Cartoon Ad',
    subtitle: 'Quick promo spot with voiceover',
    icon: <Clapperboard size={20} />,
  },
  {
    id: '2min-short-film',
    title: '2min Short Film',
    subtitle: 'Narrative arc with multiple scenes',
    icon: <Film size={20} />,
  },
  {
    id: 'blank-canvas',
    title: 'Blank Canvas',
    subtitle: 'Start with an empty timeline',
    icon: <FileText size={20} />,
  },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface EmptyProjectsStateProps {
  onCreateProject: (templateId?: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmptyProjectsState({ onCreateProject }: EmptyProjectsStateProps) {
  const handleScratch = useCallback(() => {
    onCreateProject();
  }, [onCreateProject]);

  /* ---- Render ---- */

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: '64px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          width: '100%',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* ---- AF Icon ---- */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--brand-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--brand)',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            AF
          </span>
        </div>

        {/* ---- Heading ---- */}
        <h2
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--text-primary)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Your first project starts here
        </h2>

        {/* ---- Subheading ---- */}
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          AnimaForge turns your ideas into animation. Pick a starting point:
        </p>

        {/* ---- Template Cards ---- */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            marginTop: 24,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => onCreateProject(template.id)}
            />
          ))}
        </div>

        {/* ---- Start from scratch link ---- */}
        <button
          type="button"
          onClick={handleScratch}
          style={{
            marginTop: 20,
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
            padding: '4px 8px',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
            transition: 'color 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--brand)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Or start from scratch
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Card                                                      */
/* ------------------------------------------------------------------ */

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '1 1 0',
        maxWidth: 170,
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'border-color 150ms, background 150ms',
        textAlign: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-brand)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ color: 'var(--text-secondary)' }}>{template.icon}</div>

      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
        }}
      >
        {template.title}
      </span>

      <span
        style={{
          fontSize: 10,
          color: 'var(--text-secondary)',
          lineHeight: 1.3,
        }}
      >
        {template.subtitle}
      </span>
    </button>
  );
}
