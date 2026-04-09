'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Share2, MoreHorizontal, Pin, Copy, Layers, PinOff, Archive, Trash2, PenLine } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(project.isPinned ?? false);
  const [showDropdown, setShowDropdown] = useState(false);

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
        toast.success('Review link copied to clipboard');
      });
    },
    [reviewUrl],
  );

  const handleToggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown((prev) => !prev);
  }, []);

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsPinned((prev) => {
        const next = !prev;
        toast.success(next ? 'Project pinned' : 'Project unpinned');
        return next;
      });
    },
    [],
  );

  const handleDropdownAction = useCallback(
    (action: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowDropdown(false);
      switch (action) {
        case 'rename':
          toast.success('Rename dialog opened');
          break;
        case 'duplicate':
          toast.success('Project duplicated');
          break;
        case 'pin':
          setIsPinned((prev) => {
            const next = !prev;
            toast.success(next ? 'Project pinned' : 'Project unpinned');
            return next;
          });
          break;
        case 'archive':
          toast.success('Project archived');
          break;
        case 'delete':
          toast.success('Project deleted');
          break;
      }
    },
    [],
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowDropdown(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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
      className="group project-card"
      data-status={project.status}
      data-pinned={isPinned ? '' : undefined}
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 150ms, background 150ms',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        handleMouseEnter();
        e.currentTarget.style.borderColor = 'var(--border-brand)';
        e.currentTarget.style.background = 'rgba(124,58,237,0.04)';
      }}
      onMouseLeave={(e) => {
        handleMouseLeave();
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--bg-elevated)';
      }}
    >
      {/* ---- Thumbnail ---- */}
      <div style={{ position: 'relative', height: 100, overflow: 'hidden' }}>
        {/* Gradient background — always rendered behind content */}
        <div
          className={`thumbnail-gradient${project.status === 'generating' ? ' thumbnail-generating' : ''}`}
          style={{
            position: 'absolute',
            inset: 0,
            background: thumbnailBackground,
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* Static thumbnail image */}
        {project.thumbnailUrl && (
          <Image
            src={project.thumbnailUrl}
            alt={`${project.title} thumbnail`}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            style={{ objectFit: 'cover', position: 'relative', zIndex: 1 }}
            priority={index < 3}
          />
        )}

        {/* Video preview on hover */}
        {project.previewVideoUrl && (
          <video
            ref={videoRef}
            src={project.previewVideoUrl}
            muted
            loop
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 2,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 300ms ease',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Pin button — top-left */}
        <button
          type="button"
          className="pin-btn"
          aria-label={isPinned ? 'Unpin project' : 'Pin project'}
          onClick={handleTogglePin}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 5,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            border: '0.5px solid rgba(255,255,255,0.15)',
            background: isPinned ? 'rgba(124,58,237,0.6)' : 'rgba(0,0,0,0.6)',
            color: isPinned ? 'var(--brand-light)' : 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: 0,
            opacity: isPinned ? 1 : isHovered ? 1 : 0,
            transition: 'opacity 150ms, background 150ms, color 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124,58,237,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isPinned
              ? 'rgba(124,58,237,0.6)'
              : 'rgba(0,0,0,0.6)';
          }}
        >
          <Pin
            size={14}
            fill={isPinned ? 'currentColor' : 'none'}
          />
        </button>

        {/* Status badge — top-right */}
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 5,
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

        {/* Quick action buttons — bottom-right of thumbnail */}
        <div
          className="quick-actions-overlay"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            zIndex: 5,
            display: 'flex',
            gap: 4,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 150ms',
          }}
        >
          <ThumbnailActionButton
            label="Open timeline"
            onClick={handlePlay}
          >
            <Play size={13} />
          </ThumbnailActionButton>
          <ThumbnailActionButton
            label="Share review link"
            onClick={handleCopyReviewLink}
          >
            <Share2 size={13} />
          </ThumbnailActionButton>
          <div style={{ position: 'relative' }}>
            <ThumbnailActionButton
              label="More options"
              onClick={handleToggleDropdown}
            >
              <MoreHorizontal size={13} />
            </ThumbnailActionButton>

            {/* Dropdown menu */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 20,
                    minWidth: 140,
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '4px 0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <DropdownItem
                    icon={<PenLine size={12} />}
                    label="Rename"
                    onClick={handleDropdownAction('rename')}
                  />
                  <DropdownItem
                    icon={<Copy size={12} />}
                    label="Duplicate"
                    onClick={handleDropdownAction('duplicate')}
                  />
                  <DropdownItem
                    icon={isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                    label={isPinned ? 'Unpin' : 'Pin'}
                    onClick={handleDropdownAction('pin')}
                  />
                  <DropdownItem
                    icon={<Archive size={12} />}
                    label="Archive"
                    onClick={handleDropdownAction('archive')}
                  />
                  <div
                    style={{
                      height: '0.5px',
                      background: 'var(--border)',
                      margin: '4px 0',
                    }}
                  />
                  <DropdownItem
                    icon={<Trash2 size={12} />}
                    label="Delete"
                    onClick={handleDropdownAction('delete')}
                    danger
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Type tag — bottom-left */}
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 5,
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

        {/* Bottom row: avatars */}
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
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Thumbnail action button (overlay buttons)                          */
/* ------------------------------------------------------------------ */

interface ThumbnailActionButtonProps {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function ThumbnailActionButton({ label, onClick, children }: ThumbnailActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: '0.5px solid rgba(255,255,255,0.15)',
        background: 'rgba(0,0,0,0.6)',
        color: 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 150ms, color 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(124,58,237,0.6)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Dropdown menu item                                                 */
/* ------------------------------------------------------------------ */

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}

function DropdownItem({ icon, label, onClick, danger }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 400,
        color: danger ? 'var(--status-error-text, #ef4444)' : 'var(--text-secondary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 100ms, color 100ms',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.color = danger
          ? 'var(--status-error-text, #ef4444)'
          : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger
          ? 'var(--status-error-text, #ef4444)'
          : 'var(--text-secondary)';
      }}
    >
      {icon}
      {label}
    </button>
  );
}
