// Which Storyblok token and content version a build uses.
// Production (static) gets published content with the public token; preview (SSR) and dev get drafts
// with the preview token. No `import.meta.env` or `~` imports here, so astro.config.mjs can use it too.

type Env = Record<string, string | undefined>;

export const isPreviewMode = (isDev: boolean, buildType?: string): boolean =>
  isDev || buildType === 'server';

export const contentVersion = (isPreview: boolean): 'draft' | 'published' =>
  isPreview ? 'draft' : 'published';

export function storyblokToken(env: Env, isPreview: boolean): string {
  const name = isPreview ? 'STORYBLOK_PREVIEW_TOKEN' : 'STORYBLOK_PUBLIC_TOKEN';
  const token = env[name]?.trim();
  if (!token) throw new Error(`${name} is not set (see .env.example)`);
  return token;
}
