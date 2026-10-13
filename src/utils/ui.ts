// Site-wide UI texts that no Storyblok story owns (skip link, menu button…). Pure so `node --test`
// can run ui.test.ts directly.
const STRINGS = {
  es: {
    skip_link: 'Saltar al contenido',
    menu: 'Menú',
    main_nav: 'Principal',
  },
  en: {
    skip_link: 'Skip to content',
    menu: 'Menu',
    main_nav: 'Main',
  },
};

export type UiStrings = typeof STRINGS.en;

export const uiStrings = (lang: string): UiStrings =>
  STRINGS[lang as keyof typeof STRINGS] ?? STRINGS.en;
