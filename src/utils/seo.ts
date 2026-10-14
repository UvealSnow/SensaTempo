// Link-preview and search metadata. Pure (no `~` or astro imports) so `node --test` can run
// seo.test.ts directly.
import { imageUrl, type StoryblokAsset } from './images.ts';

// og:locale needs a region; the site's Spanish is Mexican
const OG_LOCALES: Record<string, string> = { es: 'es_MX', en: 'en_US' };
export const ogLocale = (lang: string): string => OG_LOCALES[lang] ?? lang;

// The size Facebook, LinkedIn and X recommend for large previews
export const SHARE_IMAGE = { width: 1200, height: 630 } as const;

export interface ShareImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** The first asset with a file, cropped to 1200×630 around its focal point (JPEG: not every network reads WebP). */
export function shareImage(
  ...assets: (StoryblokAsset | null | undefined)[]
): ShareImage | null {
  const asset = assets.find((candidate) => candidate?.filename);
  if (!asset?.filename) return null;
  return {
    url: imageUrl(asset.filename, SHARE_IMAGE.width, SHARE_IMAGE.height, {
      focus: asset.focus,
      format: 'jpeg',
    }),
    ...SHARE_IMAGE,
    alt: asset.alt?.trim() ?? '',
  };
}

export interface SeoDefaults {
  siteName: string;
  description: string;
  image?: StoryblokAsset;
  xHandle?: string;
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** Site-wide defaults from the `layout/seo` story, with code fallbacks while it's missing. */
export function seoDefaults(
  blok: Record<string, unknown> | null | undefined,
  fallback: { siteName: string; description: string }
): SeoDefaults {
  const handle = text(blok?.x_handle)?.replace(/^@?/, '@');
  return {
    siteName: text(blok?.site_name) ?? fallback.siteName,
    description: text(blok?.description) ?? fallback.description,
    image: (blok?.image as StoryblokAsset | undefined)?.filename
      ? (blok?.image as StoryblokAsset)
      : undefined,
    xHandle: handle,
  };
}

/** "Page · Site", or just the site name when the page has no title of its own. */
export const fullTitle = (title: string | undefined, siteName: string) =>
  title && title !== siteName ? `${title} · ${siteName}` : siteName;

/** JSON-LD for a `<script type="application/ld+json">`: `<` escaped so content can't close the tag. */
export const jsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, '\\u003c');
