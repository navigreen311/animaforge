import { test as base, expect } from '@playwright/test';

/**
 * The `test` every spec imports.
 *
 * Pre-accepts the cookie consent banner before the first script runs on the
 * page. The banner is fixed to the bottom of the viewport on every route,
 * including /login, and it overlays page content — so any click landing near
 * it hits the banner instead of the target. That is a genuine intermittent
 * failure that depends on viewport size and where the element happens to sit,
 * which is exactly the kind of flake that gets "fixed" with a retry.
 *
 * Seeding the stored preference rather than clicking "Accept all" keeps it out
 * of the way without adding a conditional click to every spec, and leaves the
 * banner itself testable by a spec that wants to clear the key first.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'af-cookie-consent',
        JSON.stringify({ necessary: true, analytics: false, marketing: false }),
      );
    });
    await use(page);
  },
});

export { expect };
