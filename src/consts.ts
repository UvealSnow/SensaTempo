// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Astro Blog';
export const SITE_DESCRIPTION = 'Welcome to my website!';
export const AVAILABLE_LANGUAGES = (import.meta.env.PUBLIC_AVAILABLE_LANGUAGES || '').split(',');
