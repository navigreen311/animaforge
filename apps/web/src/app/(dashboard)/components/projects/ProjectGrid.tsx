'use client';

import { Plus } from 'lucide-react';
import type { Project, ViewMode } from '@/lib/types';
import { useUIStore } from '@/store/useUIStore';
import ProjectCard from './ProjectCard';
import ProjectCardSkeleton from './ProjectCardSkeleton';

interface ProjectGridProps {
  projects: Project[];
  loading?: boolean;
  viewMode: ViewMode;
}

export default function ProjectGrid({ projects, loading, viewMode }: ProjectGridProps) {
  const setNewProjectModalOpen = useUIStore((s) => s.setNewProjectModalOpen);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {[0, 1, 2].map((i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  /* ── Empty state ── */
  if (projects.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px dashed var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: 48,
        }}
      >
        <Plus size={48} style={{ color: 'var(--brand-dim)' }} />

        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginTop: 12,
          }}
        >
          Your first project starts here
        </p>

        <p
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginTop: 4,
          }}
        >
          Create a cartoon, animation, or video with AI
        </p>

        <button
          onClick={() => setNewProjectModalOpen(true)}
          style={{
            background: 'var(--brand)',
            color: '#ffffff',
            padding: '8px 20px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            marginTop: 16,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
        >
          Create your first project
        </button>
      </div>
    );
  }

  /* ── Grid mode ── */
  if (viewMode === 'grid') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {projects.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
    );
  }

  /* ── List mode ── */
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}
