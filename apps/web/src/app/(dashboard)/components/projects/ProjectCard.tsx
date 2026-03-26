'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, ExternalLink, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '@/lib/types';
import {
  formatDuration,
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

const MAX_VISIBLE_AVATARS = 3;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ProjectCardProps {
  project: Project;
  index: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const router = useRouter();
  const statusColor = getStatusColor(project.status);
  const progressPercent = getProgressPercent(project.approvedShots, project.totalShots);

  const timelineUrl = `/projects/${project.id}/timeline`;
  const reviewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/projects/${project.id}/review`;

  /* ---- Progress bar fill color ---- */
  const progressFillColor =
    project.status === 'complete'
      ? 'var(--status-complete-text)'
      : project.status === 'review'
        ? 'var(--status-review-text)'
        : 'var(--brand)';

  /* ---- Thumbnail background ---- */
  const thumbnailBackground =
    project.thumbnailGradient || getTypeGradient(project.projectType);

  /* ---- Visible / overflow team members ---- */
  const visibleMembers = project.teamMembers.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = Math.max(0, project.teamMembers.length - MAX_VISIBLE_AVATARS);

  /* ---- Handlers ---- */
  const handleCardClick = useCallback(() => {
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

  /* ---- Render ---- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      role="article"
      aria-label={`Project: ${project.title}`}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group"
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 150ms, background 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-brand)';
        e.currentTarget.style.background = 'rgba(124,58,237,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--bg-elevated)';
      }}
    >
      {/* ---- Thumbnail ---- */}
      <div style={{ position: 'relative', height: 100, overflow: 'hidden' }}>
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={`${project.title} thumbnail`}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            style={{ objectFit: 'cover' }}
            priority={index < 3}
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

        {/* Status badge */}
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '2px 8px',
            fontSize: 9,
            fontWeight: 500,
            borderRadius: 'var(--radius-pill)',
            border: `0.5px solid ${statusColor.border}`,
            background: statusColor.bg,
            color: statusColor.text,
            lineHeight: 1.6,
            userSelect: 'none',
          }}
        >
          {STATUS_LABELS[project.status] ?? project.status}
        </span>

        {/* Type tag */}
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            background: 'rgba(0,0,0,0.45)',
            color: 'var(--text-tertiary)',
            fontSize: 9,
            padding: '1px 6px',
            borderRadius: 3,
            lineHeight: 1.6,
            userSelect: 'none',
            textTransform: 'capitalize',
          }}
        >
          {project.projectType}
        </span>
      </div>

      {/* ---- Body ---- */}
      <div style={{ padding: 12 }}>
        {/* Title */}
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {project.title}
        </h3>

        {/* Description */}
        {project.description && (
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              marginTop: 2,
              marginBottom: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}
          >
            {project.description}
          </p>
        )}

        {/* Progress bar */}
        <div
          style={{
            marginTop: 8,
            height: 3,
            background: 'var(--progress-track)',
            borderRadius: 2,
            overflow: 'hidden',
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

        {/* Stats row */}
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            gap: 8,
            fontSize: 10,
            color: 'var(--text-tertiary)',
            lineHeight: 1.4,
          }}
        >
          <span>{project.totalShots} shots</span>
          <span aria-hidden="true">&middot;</span>
          <span>{project.approvedShots} approved</span>
          <span aria-hidden="true">&middot;</span>
          <span>{formatDuration(project.durationSeconds ?? 0)}</span>
        </div>

        {/* Updated */}
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: 'var(--text-tertiary)',
            lineHeight: 1.4,
          }}
        >
          Updated {timeAgo(project.updatedAt)}
        </div>

        {/* Bottom row: avatars + quick actions */}
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Avatar stack */}
          <div
            style={{ display: 'flex', alignItems: 'center' }}
            aria-label="Team members"
            role="group"
          >
            {visibleMembers.map((member, i) => (
              <div
                key={member.id}
                aria-label={member.name}
                title={member.name}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '1.5px solid var(--bg-base)',
                  background: member.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 7,
                  fontWeight: 600,
                  color: '#fff',
                  marginLeft: i === 0 ? 0 : -4,
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
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '1.5px solid var(--bg-base)',
                  background: 'var(--bg-overlay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 7,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  marginLeft: -4,
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

          {/* Quick actions — hidden by default, visible on card hover */}
          <div
            className="opacity-0 group-hover:opacity-100"
            style={{
              display: 'flex',
              gap: 4,
              transition: 'opacity 150ms',
            }}
          >
            <QuickActionButton
              label="Open timeline"
              onClick={handlePlay}
            >
              <Play size={12} />
            </QuickActionButton>
            <QuickActionButton
              label="Copy review link"
              onClick={handleCopyReviewLink}
            >
              <ExternalLink size={12} />
            </QuickActionButton>
            <QuickActionButton
              label="More options"
              onClick={handleMore}
            >
              <MoreHorizontal size={12} />
            </QuickActionButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick-action button                                                */
/* ------------------------------------------------------------------ */

interface QuickActionButtonProps {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function QuickActionButton({ label, onClick, children }: QuickActionButtonProps) {
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
