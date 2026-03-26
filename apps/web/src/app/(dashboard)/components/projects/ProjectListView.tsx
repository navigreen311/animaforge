'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, ExternalLink, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '@/lib/types';
import {
  timeAgo,
  getProgressPercent,
  getStatusColor,
  getTypeGradient,
} from '@/lib/utils/format';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  generating: 'Generating',
  review: 'In Review',
  draft: 'Draft',
  complete: 'Complete',
};

const TYPE_LABELS: Record<string, string> = {
  cartoon: 'Cartoon',
  animation: 'Animation',
  'live-action': 'Live Action',
  mixed: 'Mixed',
  documentary: 'Documentary',
};

const MAX_VISIBLE_AVATARS = 3;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ProjectListViewProps {
  projects: Project[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectListView({ projects }: ProjectListViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {projects.map((project, index) => (
        <ProjectRow key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProjectRow                                                         */
/* ------------------------------------------------------------------ */

interface ProjectRowProps {
  project: Project;
  index: number;
}

function ProjectRow({ project, index }: ProjectRowProps) {
  const router = useRouter();
  const statusColor = getStatusColor(project.status);
  const progressPercent = getProgressPercent(project.approvedShots, project.totalShots);

  const timelineUrl = `/projects/${project.id}/timeline`;
  const reviewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/projects/${project.id}/review`;

  const thumbnailBackground =
    project.thumbnailGradient || getTypeGradient(project.projectType);

  const progressFillColor =
    project.status === 'complete'
      ? 'var(--status-complete-text)'
      : project.status === 'review'
        ? 'var(--status-review-text)'
        : 'var(--brand)';

  const visibleMembers = project.teamMembers.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = Math.max(0, project.teamMembers.length - MAX_VISIBLE_AVATARS);

  /* ---- Handlers ---- */
  const handleRowClick = useCallback(() => {
    router.push(timelineUrl);
  }, [router, timelineUrl]);

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(timelineUrl);
    },
    [router, timelineUrl],
  );

  const handleCopyReviewLink = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(reviewUrl).then(() => {
        toast('Review link copied to clipboard');
      });
    },
    [reviewUrl],
  );

  const handleMore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      role="row"
      aria-label={`Project: ${project.title}`}
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className="group"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 56,
        padding: '0 12px',
        gap: 12,
        borderBottom: '0.5px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* ---- Thumbnail ---- */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={`${project.title} thumbnail`}
            fill
            sizes="48px"
            style={{ objectFit: 'cover' }}
            priority={index < 5}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: thumbnailBackground,
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* ---- Title + Description ---- */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          {project.title}
        </h3>
        {project.description && (
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}
          >
            {project.description}
          </p>
        )}
      </div>

      {/* ---- Type badge ---- */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text-tertiary)',
          textTransform: 'capitalize',
          whiteSpace: 'nowrap',
          lineHeight: 1.6,
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {TYPE_LABELS[project.projectType] ?? project.projectType}
      </span>

      {/* ---- Status badge ---- */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: 'var(--radius-pill)',
          border: `0.5px solid ${statusColor.border}`,
          background: statusColor.bg,
          color: statusColor.text,
          whiteSpace: 'nowrap',
          lineHeight: 1.6,
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {STATUS_LABELS[project.status] ?? project.status}
      </span>

      {/* ---- Progress bar ---- */}
      <div
        style={{
          width: 100,
          height: 4,
          background: 'var(--progress-track)',
          borderRadius: 2,
          overflow: 'hidden',
          flexShrink: 0,
        }}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${progressPercent}%`}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: progressFillColor,
            borderRadius: 2,
            transition: 'width 300ms ease',
          }}
        />
      </div>

      {/* ---- Shots approved/total ---- */}
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          minWidth: 48,
          textAlign: 'center',
        }}
      >
        {project.approvedShots}/{project.totalShots}
      </span>

      {/* ---- Team avatars ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        aria-label="Team members"
        role="group"
      >
        {visibleMembers.map((member, i) => (
          <div
            key={member.id}
            aria-label={member.name}
            title={member.name}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '1.5px solid var(--bg-base)',
              background: member.avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              fontWeight: 600,
              color: '#fff',
              marginLeft: i === 0 ? 0 : -5,
              position: 'relative',
              zIndex: MAX_VISIBLE_AVATARS - i,
              lineHeight: 1,
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {member.initials}
          </div>
        ))}
        {overflowCount > 0 && (
          <div
            aria-label={`${overflowCount} more team members`}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '1.5px solid var(--bg-base)',
              background: 'var(--bg-overlay)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              marginLeft: -5,
              position: 'relative',
              zIndex: 0,
              lineHeight: 1,
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      {/* ---- Updated timeAgo ---- */}
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          minWidth: 72,
          textAlign: 'right',
        }}
      >
        {timeAgo(project.updatedAt)}
      </span>

      {/* ---- Quick action icons ---- */}
      <div
        className="opacity-0 group-hover:opacity-100"
        style={{
          display: 'flex',
          gap: 2,
          flexShrink: 0,
          transition: 'opacity 150ms',
        }}
      >
        <RowActionButton label="Open timeline" onClick={handlePlay}>
          <Play size={12} />
        </RowActionButton>
        <RowActionButton label="Copy review link" onClick={handleCopyReviewLink}>
          <ExternalLink size={12} />
        </RowActionButton>
        <RowActionButton label="More options" onClick={handleMore}>
          <MoreHorizontal size={12} />
        </RowActionButton>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  RowActionButton                                                    */
/* ------------------------------------------------------------------ */

interface RowActionButtonProps {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function RowActionButton({ label, onClick, children }: RowActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-tertiary)',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 150ms, color 150ms',
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
      {children}
    </button>
  );
}
