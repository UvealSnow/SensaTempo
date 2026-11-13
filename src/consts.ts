import { siteDescription, siteName } from './utils/site.ts';

// Per deploy (PUBLIC_SITE_NAME, PUBLIC_SITE_DESCRIPTION)
export const SITE_TITLE = siteName(import.meta.env);
export const SITE_DESCRIPTION = siteDescription(import.meta.env);
export const DEFAULT_LANGUAGE = import.meta.env.PUBLIC_DEFAULT_LANGUAGE || 'es';
export const AVAILABLE_LANGUAGES = (
  import.meta.env.PUBLIC_AVAILABLE_LANGUAGES || ''
).split(',');
// hreflang x-default: crawlers and browsers whose language isn't listed get English
export const X_DEFAULT_LANGUAGE = 'en';
