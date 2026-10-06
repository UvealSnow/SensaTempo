// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, sessionDrivers } from 'astro/config';
import node from '@astrojs/node';
import { storyblok } from '@storyblok/astro';
import { loadEnv } from 'vite';
import { isPreviewMode, storyblokToken } from './src/utils/storyblok.ts';

const env = loadEnv('', process.cwd(), ['STORYBLOK', 'PUBLIC_']);

// https://astro.build/config
const isServerBuild = process.env.PUBLIC_BUILD_TYPE === 'server';
const output = isServerBuild ? 'server' : 'static';
// Preview (SSR) and `astro dev` read drafts with the preview token; prod builds use the public one
const isPreview = isPreviewMode(
  process.argv.includes('dev'),
  process.env.PUBLIC_BUILD_TYPE
);

// Same sources and defaults as DEFAULT_LANGUAGE / AVAILABLE_LANGUAGES in src/consts.ts
const defaultLocale =
  process.env.PUBLIC_DEFAULT_LANGUAGE || env.PUBLIC_DEFAULT_LANGUAGE || 'es';
const locales = (
  process.env.PUBLIC_AVAILABLE_LANGUAGES ||
  env.PUBLIC_AVAILABLE_LANGUAGES ||
  defaultLocale
).split(',');

export default defineConfig({
  site: 'https://sensatempo.com',

  // Only so components can read Astro.currentLocale; routing stays ours (src/pages/[lang]/ and
  // the CloudFront root redirect), hence "manual": no i18n middleware redirects or 404s
  i18n: { locales, defaultLocale, routing: 'manual' },
  // Controlled via PUBLIC_BUILD_TYPE env: "static" | "server"
  output,
  adapter: isServerBuild
    ? node({
        mode: 'standalone',
      })
    : undefined,

  // Default Node adapter sessions use the filesystem; Lambda only allows writes under /tmp.
  ...(isServerBuild
    ? {
        session: {
          driver: sessionDrivers.fsLite({
            base: '/tmp/astro-sessions',
          }),
        },
      }
    : {}),

  integrations: [
    sitemap(),
    storyblok({
      accessToken: storyblokToken(env, isPreview),
      components: {
        page: 'storyblok/Page',
        post: 'storyblok/Post',
        picture: 'storyblok/Picture',
        text: 'storyblok/Text',
        post_list: 'storyblok/PostList',
        teaser: 'storyblok/Teaser',
      },
      apiOptions: {},
      // Visual Editor support on the preview server only; the static site never loads the bridge.
      // livePreview re-renders on each keystroke by POSTing the edited story to the page.
      // The bridge resolves post_list.posts in live edits too, like the server fetch does
      bridge: isServerBuild ? { resolveRelations: ['post_list.posts'] } : false,
      livePreview: isServerBuild,
      // Blocks without an Astro component yet shouldn't break the editor; prod builds still fail
      enableFallbackComponent: isServerBuild,
    }),
  ],

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
    // Bundle (and tree-shake) the Storyblok SDK; as an external it drags ~80 MB of rich-text deps into the Lambda zip
    ssr: {
      noExternal: ['@storyblok/js'],
    },
    resolve: {
      alias: {
        '~': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
