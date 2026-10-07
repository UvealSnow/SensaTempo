// Responsive images from the Storyblok image service. Pure functions (no `~` or astro imports) so
// `node --test` can run images.test.ts directly.

export type Ratio = 'golden' | 'square' | 'original';

export interface StoryblokAsset {
  filename?: string | null;
  alt?: string | null;
  focus?: string | null;
}

export interface ResponsiveImage {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
  placeholder: string;
  alt: string;
}

// Column spans per breakpoint, as `n/12` (see utils/grid.ts); phones are always full width
export interface Spans {
  md?: string;
  lg?: string;
}

const GOLDEN_RATIO = 1.618;
// Never send originals: these widths cover phones (1x–3x) up to full-width desktop
export const WIDTHS = [480, 800, 1200, 1600, 2400] as const;
const QUALITY = 75;
const PLACEHOLDER_WIDTH = 32;
// Widest the `container` gets (Tailwind's 2xl breakpoint)
const MAX_CONTENT_WIDTH = 1536;

/** Original size from an asset URL (`/f/{space}/{width}x{height}/{hash}/{name}`). */
export function assetDimensions(
  filename: string
): { width: number; height: number } | null {
  const match = filename.match(/\/f\/\d+\/(\d+)x(\d+)\//);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

/** Width / height of the crop; the original's own ratio for `original`. */
export function aspectRatio(
  ratio: Ratio,
  original: { width: number; height: number }
): number {
  if (ratio === 'square') return 1;
  if (ratio === 'golden') return GOLDEN_RATIO;
  return original.width / original.height;
}

/** Image service URL: resized and cropped to `width`×`height` around the focal point, WebP by default. */
export function imageUrl(
  filename: string,
  width: number,
  height: number,
  {
    quality = QUALITY,
    focus,
    format = 'webp',
  }: { quality?: number; focus?: string | null; format?: 'webp' | 'jpeg' } = {}
): string {
  const filters = [
    focus ? `focal(${focus})` : '',
    `quality(${quality})`,
    `format(${format})`,
  ].filter(Boolean);
  return `${normalizeUrl(filename)}/m/${width}x${height}/filters:${filters.join(':')}`;
}

/** `sizes` for an image spanning `spans` of the 12-column grid. */
export function sizesFor({ md, lg }: Spans = {}): string {
  const fraction = (span?: string) => {
    const [n] = (span ?? '12/12').split('/').map(Number);
    return Number.isFinite(n) && n > 0 && n <= 12 ? n / 12 : 1;
  };
  const desktop = fraction(lg);
  const tablet = fraction(md ?? lg);
  const vw = (f: number) => `${Math.round(f * 100)}vw`;
  return [
    `(min-width: ${MAX_CONTENT_WIDTH}px) ${Math.round(desktop * MAX_CONTENT_WIDTH)}px`,
    `(min-width: 1024px) ${vw(desktop)}`,
    `(min-width: 768px) ${vw(tablet)}`,
    '100vw',
  ].join(', ');
}

/** Everything an <img> needs for a Storyblok asset, or null when the field is empty. */
export function responsiveImage(
  asset: StoryblokAsset | null | undefined,
  { ratio = 'golden', spans }: { ratio?: Ratio; spans?: Spans } = {}
): ResponsiveImage | null {
  if (!asset?.filename) return null;
  const original = assetDimensions(asset.filename);
  if (!original) return null;

  const aspect = aspectRatio(ratio, original);
  const heightFor = (width: number) => Math.round(width / aspect);
  // No upscaling: drop widths beyond the original, but always keep one size
  const widths: number[] = WIDTHS.filter((width) => width <= original.width);
  if (!widths.length) widths.push(original.width);
  const largest = widths[widths.length - 1];
  const url = (width: number, quality?: number) =>
    imageUrl(asset.filename!, width, heightFor(width), {
      quality,
      focus: asset.focus,
    });

  return {
    src: url(widths[Math.min(1, widths.length - 1)]),
    srcset: widths.map((width) => `${url(width)} ${width}w`).join(', '),
    sizes: sizesFor(spans),
    width: largest,
    height: heightFor(largest),
    placeholder: url(PLACEHOLDER_WIDTH, 30),
    alt: asset.alt ?? '',
  };
}

// Asset URLs may be protocol-relative (`//a.storyblok.com/...`)
const normalizeUrl = (url: string) =>
  url.startsWith('//') ? `https:${url}` : url;
