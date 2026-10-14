// Per-deploy site settings, from env so one codebase can serve different domains. Pure (no `~` or
// astro imports): astro.config.mjs and `node --test` load it directly.
import { isPreviewMode } from './storyblok.ts';

const DEFAULT_SITE_URL = 'https://sensatempo.com';

interface SiteEnv {
  PUBLIC_SITE_URL?: string;
  PUBLIC_ALLOW_INDEXING?: string;
  PUBLIC_BUILD_TYPE?: string;
}

/** The deploy's public origin (canonical URLs, og:url, sitemap), without a trailing slash. */
export function siteUrl(env: SiteEnv): string {
  const value = env.PUBLIC_SITE_URL?.trim();
  if (!value) return DEFAULT_SITE_URL;
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`PUBLIC_SITE_URL must be an absolute URL, got "${value}"`);
  }
}

/** Search engines may index this deploy: opt-in, and never for the preview or `astro dev`. */
export const allowIndexing = (env: SiteEnv, isDev = false): boolean =>
  env.PUBLIC_ALLOW_INDEXING?.trim() === 'true' &&
  !isPreviewMode(isDev, env.PUBLIC_BUILD_TYPE);

/**
 * robots.txt. Never blocks crawlers: link-preview bots (Twitterbot, LinkedInBot) obey it, and search
 * engines must read the pages' noindex. The sitemap is only advertised when indexing is allowed.
 */
export function robotsTxt(site: string, indexing: boolean): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (indexing) lines.push('', `Sitemap: ${site}/sitemap-index.xml`);
  return `${lines.join('\n')}\n`;
}
