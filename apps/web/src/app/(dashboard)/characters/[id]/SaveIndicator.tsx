'use client';

import { AlertCircle, Check, Loader2 } from 'lucide-react';

export type SaveStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export interface SaveIndicatorProps {
  status: SaveStatus;
  errorMessage?: string | null;
  /** Shown when there is no character to save against. */
  unsavedLabel?: string;
  persisted: boolean;
}

/**
 * Autosave status for the character tabs.
 *
 * The tabs used to log to the console and discard the edit, so a user had no
 * way to tell a saved change from a lost one. This says which it was, and
 * surfaces the server's message when a save fails.
 */
export default function SaveIndicator({
  status,
  errorMessage,
  unsavedLabel = 'Not saved — no character loaded',
  persisted,
}: SaveIndicatorProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    minHeight: 18,
  };

  if (!persisted) {
    return (
      <div style={{ ...base, color: 'var(--text-tertiary)' }} role="status">
        {unsavedLabel}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ ...base, color: '#f87171' }} role="alert">
        <AlertCircle size={12} />
        {errorMessage ?? 'Could not save changes'}
      </div>
    );
  }

  if (status === 'loading' || status === 'saving') {
    return (
      <div style={{ ...base, color: 'var(--text-tertiary)' }} role="status">
        <Loader2 size={12} className="spin" />
        {status === 'loading' ? 'Loading…' : 'Saving…'}
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div style={{ ...base, color: '#6ee7b7' }} role="status">
        <Check size={12} />
        Saved
      </div>
    );
  }

  return <div style={base} role="status" />;
}
