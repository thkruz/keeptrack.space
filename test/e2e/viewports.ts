import { type BrowserContextOptions } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * The one definition of the viewport sizes browser tests run at (#614). The Pro QA harness keeps its own copy
 * in `src/plugins-pro/scripts/browser-agent/viewport.js` (VIEWPORT_PRESETS, MOBILE_USER_AGENTS); point it here
 * when that file next changes.
 *
 * Phone sizes carry a mobile user agent because the app decides mobile mode from a navigator.userAgent regex
 * (src/app/ui/mobileManager.ts checkIfMobileDevice); `isMobile` and touch alone do not switch it on.
 */
export type ViewportName = 'desktop' | 'laptop' | 'phone' | 'phone-narrow';

export interface ViewportDefinition {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent?: string;
}

// Read at runtime: Node ESM needs an import attribute for JSON, which the Playwright config loader rejects.
export const VIEWPORTS = JSON.parse(readFileSync(new URL('./viewports.json', import.meta.url), 'utf8')) as Record<ViewportName, ViewportDefinition>;

/** Playwright `use` options (viewport, scale, touch, user agent) for a named viewport. */
export function viewportUse(name: ViewportName): BrowserContextOptions {
  const v = VIEWPORTS[name];

  return {
    viewport: { width: v.width, height: v.height },
    screen: { width: v.width, height: v.height },
    deviceScaleFactor: v.deviceScaleFactor,
    isMobile: v.isMobile,
    hasTouch: v.hasTouch,
    ...(v.userAgent ? { userAgent: v.userAgent } : {}),
  };
}
