/**
 * AnimaForge — Accessibility utilities
 */

// ---------------------------------------------------------------------------
// Focus management
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap keyboard focus inside `container` until the returned cleanup
 * function is called.
 */
export function trapFocus(container: HTMLElement): () => void {
  function handler(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener('keydown', handler);

  // Auto-focus the first focusable child
  const first = container.querySelector<HTMLElement>(FOCUSABLE);
  first?.focus();

  return () => container.removeEventListener('keydown', handler);
}

// ---------------------------------------------------------------------------
// Live announcements
// ---------------------------------------------------------------------------

let liveRegion: HTMLElement | null = null;

/**
 * Announce a message to screen readers via an aria-live region.
 * Creates the region element on first call.
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  if (typeof document === 'undefined') return;

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    Object.assign(liveRegion.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(liveRegion);
  }

  liveRegion.setAttribute('aria-live', priority);
  // Clear then set to trigger re-announcement
  liveRegion.textContent = '';
  requestAnimationFrame(() => {
    if (liveRegion) liveRegion.textContent = message;
  });
}

// ---------------------------------------------------------------------------
// Motion preferences
// ---------------------------------------------------------------------------

/**
 * Returns true when the user has requested reduced motion at the OS level.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Contrast checking (WCAG 2.x relative luminance)
// ---------------------------------------------------------------------------

interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
}

/**
 * Parse a hex colour (#RGB or #RRGGBB) into [r, g, b] 0-255.
 */
function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate the WCAG contrast ratio between two hex colours and report
 * whether the pair meets AA (>= 4.5) and AAA (>= 7) for normal text.
 */
export function checkContrast(fg: string, bg: string): ContrastResult {
  const l1 = relativeLuminance(...parseHex(fg));
  const l2 = relativeLuminance(...parseHex(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
  };
}
