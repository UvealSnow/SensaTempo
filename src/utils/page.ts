import type { AstroGlobal } from 'astro';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from '~/consts';
import { slugFromPath } from '~/utils/navigation';

/** Language of the page being rendered, from the URL (see `i18n` in astro.config). */
export const currentLang = (
  astro: Pick<AstroGlobal, 'currentLocale'>
): string => astro.currentLocale ?? DEFAULT_LANGUAGE;

/** Story slug of the page being rendered (`about`, `blog/x`), or `home` for the language root. */
export const currentSlug = (astro: Pick<AstroGlobal, 'url'>): string =>
  slugFromPath(astro.url.pathname, AVAILABLE_LANGUAGES);
