// Cloudflare Web Analytics: cookieless page views, so no consent banner. Production builds only:
// the preview (editors) and `pnpm dev` would skew the numbers. The token is public (it ends up in the page).
import { isPreviewMode } from './storyblok.ts';

interface AnalyticsEnv {
  DEV: boolean;
  PUBLIC_BUILD_TYPE?: string;
  PUBLIC_CF_ANALYTICS_TOKEN?: string;
}

/** The beacon token to embed, or undefined when analytics should stay off. */
export function cloudflareAnalyticsToken(
  env: AnalyticsEnv
): string | undefined {
  const token = env.PUBLIC_CF_ANALYTICS_TOKEN?.trim();
  if (!token || isPreviewMode(env.DEV, env.PUBLIC_BUILD_TYPE)) return undefined;
  return token;
}
