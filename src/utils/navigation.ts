// Localized URLs for pages and Storyblok multilinks. Pure functions (no `~` or astro imports) so
// `node --test` can run navigation.test.ts directly.

export const HOME_SLUG = 'home';

// Storyblok multilink field, with `story` filled in by `resolve_links`
export interface MultilinkField {
  linktype?: 'story' | 'url' | 'email' | 'asset';
  cached_url?: string;
  url?: string;
  email?: string;
  anchor?: string;
  story?: { full_slug?: string };
}

/** `/es/` for home, `/es/about/` for any other slug. */
export const pagePath = (lang: string, slug: string): string =>
  slug === HOME_SLUG ? `/${lang}/` : `/${lang}/${slug}/`;

/**
 * Slug of a story link without the language prefix: resolved links in a translation come back as
 * `en/about`, unresolved ones (Visual Editor payloads) only carry `cached_url`.
 */
export function linkSlug(
  link: MultilinkField | undefined,
  languages: readonly string[]
): string | null {
  if (link?.linktype !== 'story') return null;
  const parts = (link.story?.full_slug || link.cached_url || '')
    .split('/')
    .filter(Boolean);
  if (parts.length > 1 && languages.includes(parts[0])) parts.shift();
  return parts.length ? parts.join('/') : null;
}

/** Href for a multilink in `lang`, or null when the field is empty. */
export function linkHref(
  link: MultilinkField | undefined,
  lang: string,
  languages: readonly string[]
): string | null {
  if (!link) return null;

  if (link.linktype === 'story') {
    const slug = linkSlug(link, languages);
    if (!slug) return null;
    return `${pagePath(lang, slug)}${link.anchor ? `#${link.anchor}` : ''}`;
  }

  if (link.linktype === 'email') {
    const email = link.email || link.url || link.cached_url;
    return email ? `mailto:${email}` : null;
  }

  return link.url || link.cached_url || null;
}
