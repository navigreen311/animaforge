/**
 * AnimaForge — Screen reader announcer
 *
 * Creates a single hidden aria-live region used for manual screen reader
 * updates outside of Sonner toasts (which already handle their own
 * announcements). Use `announce()` to push short status messages.
 */

let announcerEl: HTMLDivElement | null = null;

function getAnnouncer(): HTMLDivElement {
  if (typeof window === 'undefined') return null as any;
  if (!announcerEl) {
    announcerEl = document.createElement('div');
    announcerEl.setAttribute('role', 'status');
    announcerEl.setAttribute('aria-live', 'polite');
    announcerEl.setAttribute('aria-atomic', 'true');
    announcerEl.style.cssText =
      'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(announcerEl);
  }
  return announcerEl;
}

/**
 * Announce `message` to screen readers via the shared live region.
 *
 * @param message  The text to announce.
 * @param priority `polite` (default) waits for idle; `assertive` interrupts.
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
) {
  const el = getAnnouncer();
  if (!el) return;
  el.setAttribute('aria-live', priority);
  el.textContent = '';
  // Force a reflow + delay so repeat messages are re-announced.
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}
