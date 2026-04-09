import { toast } from 'sonner';

/**
 * Unified notification helpers built on Sonner.
 * Import `notify` anywhere — the `<Toaster>` is rendered in the root layout.
 */
export const notify = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },

  error(message: string, description?: string) {
    toast.error(message, { description });
  },

  warning(message: string, description?: string) {
    toast.warning(message, { description });
  },

  info(message: string, description?: string) {
    toast.info(message, { description });
  },

  loading(message: string): string | number {
    return toast.loading(message);
  },

  /** Dismiss a loading toast and show render-complete. */
  renderComplete(toastId?: string | number) {
    if (toastId !== undefined) toast.dismiss(toastId);
    toast.success('Render complete', { description: 'Your animation is ready for review.' });
  },

  /** Dismiss a loading toast and show render-failed. */
  renderFailed(toastId?: string | number, reason?: string) {
    if (toastId !== undefined) toast.dismiss(toastId);
    toast.error('Render failed', { description: reason ?? 'Something went wrong. Please try again.' });
  },

  /** Warn the user about low credits. */
  creditLow(remaining: number) {
    toast.warning('Credits running low', {
      description: `You have ${remaining} credit${remaining !== 1 ? 's' : ''} remaining. Consider upgrading your plan.`,
      duration: 6000,
    });
  },
} as const;
