import type { ProjectStatus } from '../types';

/** Format a duration in seconds to a human-readable string. */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Format an ISO timestamp to a relative time string. */
export function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/** Format a credit count with locale-aware separators. */
export function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

/** Calculate progress percentage from approved/total shots. */
export function getProgressPercent(approved: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((approved / total) * 100);
}

/** Return CSS variable references for a given project status. */
export function getStatusColor(status: ProjectStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'generating':
      return {
        bg: 'var(--status-generating-bg)',
        text: 'var(--status-generating-text)',
        border: 'var(--status-generating-border)',
        dot: '#fbbf24',
      };
    case 'review':
      return {
        bg: 'var(--status-review-bg)',
        text: 'var(--status-review-text)',
        border: 'var(--status-review-border)',
        dot: '#93c5fd',
      };
    case 'draft':
      return {
        bg: 'var(--status-draft-bg)',
        text: 'var(--status-draft-text)',
        border: 'var(--status-draft-border)',
        dot: 'rgba(255,255,255,0.4)',
      };
    case 'complete':
      return {
        bg: 'var(--status-complete-bg)',
        text: 'var(--status-complete-text)',
        border: 'var(--status-complete-border)',
        dot: '#6ee7b7',
      };
  }
}

/** Map project type to a default gradient string. */
export function getTypeGradient(type: string): string {
  switch (type) {
    case 'cartoon':
      return 'linear-gradient(135deg, #0f0a2e, #1a0a3e, #0d1a3e)';
    case 'live-action':
      return 'linear-gradient(135deg, #1a0a0a, #2e1a0a, #1a1a0a)';
    case 'animation':
      return 'linear-gradient(135deg, #0a1f0a, #0d2b0d, #0a1a10)';
    case 'mixed':
      return 'linear-gradient(135deg, #0a1a2e, #1a0a2e, #0a2e1a)';
    case 'documentary':
      return 'linear-gradient(135deg, #1a1a0a, #2e2e0a, #1a2e0a)';
    default:
      return 'linear-gradient(135deg, #0f0a2e, #1a0a3e, #0d1a3e)';
  }
}
