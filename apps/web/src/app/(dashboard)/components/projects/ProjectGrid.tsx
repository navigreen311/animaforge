'use client';

import { Pin, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project, ViewMode } from '@/lib/types';
import { useUIStore } from '@/store/useUIStore';
import ProjectCard from './ProjectCard';
import ProjectCardSkeleton from './ProjectCardSkeleton';
import ProjectListView from './ProjectListView';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ProjectGridProps {
  projects: Project[];
  pinnedProjects?: Project[];
  loading?: boolean;
  viewMode: ViewMode;
}

/* ------------------------------------------------------------------ */
/*  Section label                                                      */
/* ------------------------------------------------------------------ */

function SectionLabel({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectGrid({
  projects,
  pinnedProjects,
  loading,
  viewMode,
}: ProjectGridProps) {
  const setNewProjectModalOpen = useUIStore((s) => s.setNewProjectModalOpen);

  const hasPinned = pinnedProjects && pinnedProjects.length > 0;

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
  if (projects.length === 0 && !hasPinned) {
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

  /* ── List mode ── */
  if (viewMode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {hasPinned && (
          <>
            <SectionLabel
              icon={<Pin size={12} style={{ color: 'var(--text-tertiary)' }} />}
              label="Pinned"
            />
            <ProjectListView projects={pinnedProjects!} />
            <div style={{ height: 16 }} />
            <SectionLabel label="All projects" />
          </>
        )}
        <ProjectListView projects={projects} />
      </div>
    );
  }

  /* ── Grid mode ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {hasPinned && (
        <>
          <SectionLabel
            icon={<Pin size={12} style={{ color: 'var(--text-tertiary)' }} />}
            label="Pinned"
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {pinnedProjects!.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
          <SectionLabel label="All projects" />
        </>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={hasPinned ? index + pinnedProjects!.length : index}
          />
        ))}
      </div>
    </div>
  );
}
