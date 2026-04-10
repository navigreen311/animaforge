'use client';
import { ReactNode } from 'react';
import { useFocusTrap } from '@/lib/a11y/useFocusTrap';
import { useEscapeKey } from '@/lib/a11y/useEscapeKey';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function AccessibleModal({ open, onClose, title, children, width = 480 }: Props) {
  const trapRef = useFocusTrap(open);
  useEscapeKey(open, onClose);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        ref={trapRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
        }}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
