// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { storyblok } from '@storyblok/astro';
import { loadEnv } from 'vite';

const env = loadEnv('', process.cwd(), 'STORYBLOK');

// https://astro.build/config
const isServerBuild = process.env.PUBLIC_BUILD_TYPE === 'server';
const output = isServerBuild ? 'server' : 'static';

export default defineConfig({
  site: 'https://sensatempo.com',
  // Controlled via PUBLIC_BUILD_TYPE env: "static" | "server"
  output,
  adapter: isServerBuild
    ? node({
        mode: 'standalone',
      })
    : undefined,

  integrations: [
    sitemap(),
    storyblok({
      accessToken: env.STORYBLOK_ACCESS_TOKEN,
      components: {
        page: 'storyblok/Page',
        teaser: 'storyblok/Teaser',
      },
      apiOptions: {},
    }),
  ],

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '~': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
