// Language for pages outside a /[lang]/ route (the 404). No imports: 404.astro inlines
// pickLanguage into the static page with `.toString()`, so it must be self-contained.

/**
 * Language prefix of `path` if it's available; else `es` when the browser's most preferred language
 * is Spanish (`es`, `es-*`), else `en`.
 * Same rule as `prefersSpanish` in the `sensatempo-rewrite-index` CloudFront Function
 * (terraform/main.tf), which redirects `/`: keep them in sync.
 */
export function pickLanguage(
  path: string,
  browserLanguages: readonly string[],
  available: readonly string[]
): string {
  const prefix = path.split('/')[1];
  if (prefix && available.indexOf(prefix) !== -1) return prefix;

  const preferred = (browserLanguages[0] || '').trim().toLowerCase();
  return preferred.split('-')[0] === 'es' ? 'es' : 'en';
}

/**
 * Languages of an `Accept-Language` header, most preferred first (by `q`; ties keep header order),
 * like `navigator.languages`.
 */
export function acceptLanguages(header: string | null | undefined): string[] {
  return (header || '')
    .split(',')
    .map((entry, index) => {
      const [tag, ...params] = entry.split(';');
      const q = params
        .map((param) => param.trim().toLowerCase())
        .find((param) => param.startsWith('q='));
      return { tag: tag.trim(), q: q ? parseFloat(q.slice(2)) : 1, index };
    })
    .filter(({ tag, q }) => tag && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ tag }) => tag);
}
