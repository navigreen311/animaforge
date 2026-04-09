'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Megaphone,
  BookOpen,
  Music,
  ChevronRight,
  Check,
  Sparkles,
  Palette,
  Layers,
  Zap,
  User,
  Briefcase,
  GraduationCap,
  Rocket,
  Wand2,
  Bot,
  ImagePlus,
  Video,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FormData {
  projectType: string | null;
  role: string | null;
  experience: string | null;
  aiTools: string[];
  projectTitle: string;
  styleMode: string | null;
}

const INITIAL_FORM: FormData = {
  projectType: null,
  role: null,
  experience: null,
  aiTools: [],
  projectTitle: '',
  styleMode: null,
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROJECT_TYPES = [
  { id: 'cartoon', label: 'Cartoon Short', icon: Film, color: '#8b5cf6' },
  { id: 'ad', label: 'Ad / Promo', icon: Megaphone, color: '#f59e0b' },
  { id: 'explainer', label: 'Explainer', icon: BookOpen, color: '#06b6d4' },
  { id: 'music-video', label: 'Music Video', icon: Music, color: '#ec4899' },
];

const ROLES = [
  { id: 'animator', label: 'Animator', icon: Palette },
  { id: 'director', label: 'Director', icon: Briefcase },
  { id: 'designer', label: 'Designer', icon: Layers },
  { id: 'producer', label: 'Producer', icon: User },
  { id: 'hobbyist', label: 'Hobbyist', icon: Sparkles },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Just getting started' },
  { id: 'intermediate', label: 'Intermediate', desc: '1-3 years experience' },
  { id: 'advanced', label: 'Advanced', desc: '3+ years experience' },
];

const AI_TOOLS = [
  { id: 'stable-diffusion', label: 'Stable Diffusion' },
  { id: 'midjourney', label: 'Midjourney' },
  { id: 'runway', label: 'Runway ML' },
  { id: 'dalle', label: 'DALL-E' },
  { id: 'comfyui', label: 'ComfyUI' },
  { id: 'none', label: 'None yet' },
];

const STYLE_MODES = [
  { id: 'anime', label: 'Anime', icon: Sparkles },
  { id: '3d-render', label: '3D Render', icon: Layers },
  { id: 'watercolor', label: 'Watercolor', icon: Palette },
  { id: 'pixel-art', label: 'Pixel Art', icon: Zap },
];

const QUICK_START_CARDS = [
  { title: 'Create Your First Shot', desc: 'Generate a scene with AI', icon: ImagePlus, href: '/projects' },
  { title: 'Explore Templates', desc: 'Start from a pre-built template', icon: Video, href: '/marketplace' },
  { title: 'Watch Tutorial', desc: '5-min quickstart guide', icon: Rocket, href: '/learn' },
];

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const cardBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  cursor: 'pointer',
  transition: 'all 180ms ease',
};

const cardSelected: React.CSSProperties = {
  ...cardBase,
  borderColor: 'var(--brand-border)',
  background: 'var(--bg-active)',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);

  const totalSteps = 4;

  const updateForm = useCallback((patch: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleAiTool = useCallback((toolId: string) => {
    setForm((prev) => ({
      ...prev,
      aiTools: prev.aiTools.includes(toolId)
        ? prev.aiTools.filter((t) => t !== toolId)
        : [...prev.aiTools, toolId],
    }));
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleCreateProject = async () => {
    setCreating(true);
    try {
      await fetch('/api/v1/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role,
          experience: form.experience,
          aiTools: form.aiTools,
        }),
      }).catch(() => {});

      await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.projectTitle || 'Untitled Project',
          type: form.projectType,
          styleMode: form.styleMode,
        }),
      }).catch(() => {});
    } finally {
      setCreating(false);
      next();
    }
  };

  /* ── Progress Dots ──────────────────────────────────────── */
  const ProgressDots = () => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '24px 0 8px' }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 24 : 8,
            height: 8,
            borderRadius: 99,
            background: i === step ? 'var(--brand)' : i < step ? 'var(--brand-light)' : 'var(--border-strong)',
            transition: 'all 250ms ease',
          }}
        />
      ))}
    </div>
  );

  /* ── Step 1: Welcome ────────────────────────────────────── */
  const StepWelcome = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <Wand2 size={28} color="var(--brand-light)" />
          <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Welcome to AnimaForge
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 420 }}>
          AI-powered animation studio. Create stunning animations from text, images, and your imagination.
        </p>
      </div>

      <div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, textAlign: 'center' }}>
          What are you creating?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 440 }}>
          {PROJECT_TYPES.map((pt) => (
            <div
              key={pt.id}
              onClick={() => updateForm({ projectType: pt.id })}
              style={{
                ...(form.projectType === pt.id ? cardSelected : cardBase),
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (form.projectType !== pt.id) e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                if (form.projectType !== pt.id) e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <pt.icon size={24} color={pt.color} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{pt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          type="button"
          onClick={next}
          style={{
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            padding: '10px 28px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Continue <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Skip onboarding
        </button>
      </div>
    </div>
  );

  /* ── Step 2: Profile ────────────────────────────────────── */
  const StepProfile = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Tell us about yourself</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
          We'll personalize your experience
        </p>
      </div>

      {/* Role selector */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
          Your primary role
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ROLES.map((r) => (
            <div
              key={r.id}
              onClick={() => updateForm({ role: r.id })}
              style={{
                ...(form.role === r.id ? cardSelected : cardBase),
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                color: form.role === r.id ? 'var(--text-brand)' : 'var(--text-primary)',
              }}
            >
              <r.icon size={14} />
              {r.label}
            </div>
          ))}
        </div>
      </div>

      {/* Experience level */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
          Experience with animation
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {EXPERIENCE_LEVELS.map((e) => (
            <div
              key={e.id}
              onClick={() => updateForm({ experience: e.id })}
              style={{
                ...(form.experience === e.id ? cardSelected : cardBase),
                padding: '12px 16px',
                flex: 1,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{e.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{e.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI tools multi-select */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
          AI tools you've used
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AI_TOOLS.map((tool) => {
            const selected = form.aiTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                onClick={() => toggleAiTool(tool.id)}
                style={{
                  ...(selected ? cardSelected : cardBase),
                  padding: '6px 12px',
                  fontSize: 12,
                  color: selected ? 'var(--text-brand)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {selected && <Check size={12} />}
                {tool.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={prev}
          style={{
            background: 'transparent',
            border: '0.5px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '8px 20px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          style={{
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            padding: '8px 24px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Continue <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  /* ── Step 3: Create Project ─────────────────────────────── */
  const StepCreate = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 440, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Create your first project</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
          You can always change these later
        </p>
      </div>

      {/* Title input */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
          Project title
        </label>
        <input
          type="text"
          value={form.projectTitle}
          onChange={(e) => updateForm({ projectTitle: e.target.value })}
          placeholder="My awesome animation"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-border)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
      </div>

      {/* Style mode quick-pick */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
          Style mode
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STYLE_MODES.map((sm) => (
            <div
              key={sm.id}
              onClick={() => updateForm({ styleMode: sm.id })}
              style={{
                ...(form.styleMode === sm.id ? cardSelected : cardBase),
                padding: '14px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (form.styleMode !== sm.id) e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                if (form.styleMode !== sm.id) e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <sm.icon size={18} color="var(--brand-light)" />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{sm.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={prev}
          style={{
            background: 'transparent',
            border: '0.5px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '8px 20px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleCreateProject}
          disabled={creating}
          style={{
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            padding: '10px 28px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 500,
            cursor: creating ? 'wait' : 'pointer',
            opacity: creating ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Bot size={14} />
          {creating ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </div>
  );

  /* ── Step 4: Complete ───────────────────────────────────── */
  const StepComplete = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
      {/* Animated checkmarks */}
      <div style={{ display: 'flex', gap: 16 }}>
        {['Profile saved', 'Project created', 'Ready to go'].map((label, i) => (
          <motion.div
            key={label}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.25, type: 'spring', stiffness: 260, damping: 20 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.25 + 0.15, type: 'spring', stiffness: 300, damping: 15 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--status-complete-bg)',
                border: '1px solid var(--status-complete-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={18} color="var(--status-complete-text)" />
            </motion.div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
          </motion.div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          You're all set!
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0', maxWidth: 380 }}>
          Your workspace is ready. Jump in and start creating.
        </p>
      </div>

      {/* Quick-start cards */}
      <div style={{ display: 'flex', gap: 12 }}>
        {QUICK_START_CARDS.map((card) => (
          <a
            key={card.title}
            href={card.href}
            style={{
              ...cardBase,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              width: 160,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <card.icon size={20} color="var(--brand-light)" />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{card.title}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{card.desc}</span>
          </a>
        ))}
      </div>

      <a
        href="/projects"
        style={{
          background: 'var(--brand)',
          color: '#fff',
          border: 'none',
          padding: '12px 32px',
          borderRadius: 'var(--radius-md)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Enter AnimaForge <ChevronRight size={16} />
      </a>
    </div>
  );

  const steps = [<StepWelcome key={0} />, <StepProfile key={1} />, <StepCreate key={2} />, <StepComplete key={3} />];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <ProgressDots />
      <div style={{ width: '100%', maxWidth: 560, marginTop: 32 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
