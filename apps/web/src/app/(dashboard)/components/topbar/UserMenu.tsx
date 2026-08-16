'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

/**
 * The account menu behind the avatar in the top bar.
 *
 * The avatar was a button labelled "User menu" whose onClick body was
 * `// TODO: open user dropdown` — nothing opened, and `authStore.logout()`,
 * which has existed all along, had no caller anywhere in the app (#80). There
 * was no way to sign out of the console.
 *
 * Signing out clears the session everywhere it is kept — the store, both
 * localStorage keys and the cookie the middleware reads — and then navigates
 * to /login. The navigation is a hard `replace` rather than a push so the
 * dashboard is not one Back press away, and the middleware bounces any attempt
 * to return anyway now that the cookie is gone.
 */

function initialsFor(displayName: string | undefined, email: string | undefined): string {
  const source = displayName?.trim() || email?.trim() || '';
  if (!source) return '?';
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]);
  return (letters.join('') || source.slice(0, 2)).toUpperCase();
}

export default function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on an outside click or on Escape. Without this the menu stays open
  // behind whatever the user clicks next.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleLogout = useCallback(() => {
    setOpen(false);
    logout();
    router.replace('/login');
  }, [logout, router]);

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 12,
    textAlign: 'left',
    cursor: 'pointer',
    textDecoration: 'none',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center justify-center rounded-full"
        style={{
          width: 28,
          height: 28,
          backgroundColor: 'var(--brand)',
          color: '#ffffff',
          fontSize: 10,
          fontWeight: 600,
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {initialsFor(user?.displayName, user?.email)}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 200,
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: 4,
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '0.5px solid var(--border)',
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
              {user?.displayName ?? 'Signed in'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{user?.email ?? ''}</div>
          </div>

          <Link href="/settings" role="menuitem" style={itemStyle} onClick={() => setOpen(false)}>
            <UserIcon size={14} />
            Profile
          </Link>

          <Link href="/settings" role="menuitem" style={itemStyle} onClick={() => setOpen(false)}>
            <Settings size={14} />
            Settings
          </Link>

          <button type="button" role="menuitem" style={itemStyle} onClick={handleLogout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
