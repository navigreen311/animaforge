# Accessibility

AnimaForge is working toward **WCAG 2.1 Level AA** conformance across the web
application. This document captures the current status, the utilities available
to developers, and the checklist we use when shipping new features.

## Status

Current state: **work in progress**. The primary dashboard surfaces (script,
audio, brand, assets) have been swept for form-label coverage, slider ARIA
metadata, focus-trap modals, and a screen-reader live region. Remaining work
includes full keyboard support for drag-and-drop areas, high-contrast theme QA,
and automated axe-core regression tests.

## Color contrast

The primary brand palette passes WCAG AA against the dark neutral background:

| Foreground | Background | Ratio | Result |
| --- | --- | --- | --- |
| Brand purple `#7c3aed` | App dark `#0a0a0b` | ~7.1 : 1 | passes AA & AAA normal text |
| Brand light `#a78bfa` | App dark `#0a0a0b` | ~9.5 : 1 | passes AA & AAA normal text |
| Text primary on surface | `var(--bg-surface)` | > 7 : 1 | passes AA & AAA normal text |

Use `checkContrast(fg, bg)` from `apps/web/src/lib/a11y.ts` to verify any new
color pair before merging.

## Available utilities

All utilities live under `apps/web/src/lib/a11y/` and
`apps/web/src/components/ui/`.

| Utility | Location | Purpose |
| --- | --- | --- |
| `useFocusTrap(active)` | `lib/a11y/useFocusTrap.ts` | Ref-based focus trap hook for modals and popovers. |
| `useEscapeKey(active, onEscape)` | `lib/a11y/useEscapeKey.ts` | Closes an overlay when Escape is pressed. |
| `<AccessibleModal>` | `components/ui/AccessibleModal.tsx` | Ready-to-use modal with focus trap, escape close, backdrop click, and `aria-modal`. |
| `announce(message, priority?)` | `lib/a11y/announcer.ts` | Pushes a status message to a shared `aria-live` region. Use for non-toast updates. |
| `<VisuallyHidden>` | `components/ui/VisuallyHidden.tsx` | Wraps text that should be read by screen readers but not shown visually. |
| `trapFocus`, `announceToScreenReader`, `prefersReducedMotion`, `checkContrast` | `lib/a11y.ts` | Lower-level helpers for advanced cases. |
| `<SkipLink>` | `components/ui/SkipLink.tsx` | "Skip to content" link rendered at the top of the dashboard layout. |

Sonner toasts already include their own `aria-live` region; prefer `toast.*`
for transient feedback and `announce()` for silent UI state updates (filter
applied, selection count changed, etc.).

## Keyboard shortcuts

The authoritative list lives in
[`apps/web/src/lib/keyboard-shortcuts.ts`](../apps/web/src/lib/keyboard-shortcuts.ts)
and is rendered in-app via the Shortcuts modal. Groups:

- **Global** — command palette, search, help (`GLOBAL_SHORTCUTS`).
- **Navigation** — jump-to-page shortcuts (`NAV_SHORTCUTS`).
- **Timeline** — playback and editing in the timeline editor
  (`TIMELINE_SHORTCUTS`).

All shortcuts are combined into `SHORTCUT_GROUPS`; add new bindings there so
they appear automatically in the shortcuts modal.

## Testing checklist for new features

Before merging a feature, verify every item below for the changed surfaces:

- [ ] **Keyboard only.** Can you reach, operate, and exit every control using
      only Tab, Shift+Tab, Enter/Space, arrow keys, and Escape?
- [ ] **Focus visible.** Every focusable element has a visible focus ring.
- [ ] **Form labels.** Every `<input>`, `<textarea>`, and `<select>` has either
      a `<label htmlFor>` or an `aria-label`. Sliders include `aria-valuenow`,
      `aria-valuemin`, and `aria-valuemax`.
- [ ] **Color contrast.** Text and interactive elements meet 4.5 : 1 (3 : 1
      for large text) on every background they appear over.
- [ ] **Screen reader.** Run through the flow with NVDA (Windows) or VoiceOver
      (macOS). Key state changes should be announced via toasts or
      `announce()`.
- [ ] **Motion.** Any decorative animation respects
      `prefersReducedMotion()`.
- [ ] **Modals.** Use `<AccessibleModal>` (or `useFocusTrap` + `useEscapeKey`)
      — never render a raw `<div role="dialog">` without focus management.
- [ ] **Icon-only buttons.** Provide a `<VisuallyHidden>` label or
      `aria-label`.
- [ ] **Skip link.** If you add a new top-level layout, expose a skip-to-content
      target.

Visit `/a11y-test` in the dashboard for an interactive demo of the focus trap,
live region announcer, and VisuallyHidden helper.
