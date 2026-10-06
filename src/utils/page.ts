import type { AstroGlobal } from 'astro';
import { DEFAULT_LANGUAGE } from '~/consts';
import { HOME_SLUG } from '~/utils/navigation';

/** Language of the page being rendered, from the URL (see `i18n` in astro.config). */
export const currentLang = (
  astro: Pick<AstroGlobal, 'currentLocale'>
): string => astro.currentLocale ?? DEFAULT_LANGUAGE;

/** Story slug of the page being rendered: `[slug]`, or `home` for the language root. */
export const currentSlug = (astro: Pick<AstroGlobal, 'params'>): string =>
  astro.params.slug || HOME_SLUG;
