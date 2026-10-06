// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, sessionDrivers } from 'astro/config';
import node from '@astrojs/node';
import { storyblok } from '@storyblok/astro';
import { loadEnv } from 'vite';
import { isPreviewMode, storyblokToken } from './src/utils/storyblok.ts';

const env = loadEnv('', process.cwd(), 'STORYBLOK');

// https://astro.build/config
const isServerBuild = process.env.PUBLIC_BUILD_TYPE === 'server';
const output = isServerBuild ? 'server' : 'static';
// Preview (SSR) and `astro dev` read drafts with the preview token; prod builds use the public one
const isPreview = isPreviewMode(
  process.argv.includes('dev'),
  process.env.PUBLIC_BUILD_TYPE
);

export default defineConfig({
  site: 'https://sensatempo.com',
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
        teaser: 'storyblok/Teaser',
      },
      apiOptions: {},
      // Visual Editor support on the preview server only; the static site never loads the bridge.
      // livePreview re-renders on each keystroke by POSTing the edited story to the page.
      bridge: isServerBuild,
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
