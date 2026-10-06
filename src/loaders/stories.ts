import type { LoaderContext, Loader } from 'astro/loaders';
import { apiPlugin, storyblokInit, type ISbStoriesParams } from '@storyblok/js';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from '~/consts';
import { storySlug } from '~/utils/navigation';
import { z } from 'astro:content';
import { loadEnv } from 'vite';
import {
  contentVersion,
  isPreviewMode,
  storyblokToken,
} from '~/utils/storyblok';

const env = loadEnv('', process.cwd(), 'STORYBLOK');
const isDev = import.meta.env.DEV;
const isPreview = isPreviewMode(isDev, import.meta.env.PUBLIC_BUILD_TYPE);

/**
 * Every story matching `params` (e.g. `content_type: 'page'`), once per available language.
 * `name` labels the loader and its logs.
 */
export function storiesLoader(name: string, params: ISbStoriesParams): Loader {
  return {
    name: `storyblok-${name}-loader`,
    load: async ({
      meta,
      store,
      logger,
      parseData,
      generateDigest,
    }: LoaderContext): Promise<void> => {
      try {
        const { storyblokApi } = storyblokInit({
          accessToken: storyblokToken(env, isPreview),
          use: [apiPlugin],
        });

        if (!storyblokApi) {
          throw new Error('Unable to init StoryBlok api');
        }

        if (isDev) store.clear();
        for (let i = 0; i < AVAILABLE_LANGUAGES.length; i++) {
          const lang =
            AVAILABLE_LANGUAGES[i] === DEFAULT_LANGUAGE
              ? undefined
              : AVAILABLE_LANGUAGES[i];

          logger.info(`Loading collection - ${AVAILABLE_LANGUAGES[i]} ${name}`);
          logger.info(`Collection last modified ${meta.get('lastModified')}`);

          const data = await storyblokApi.getAll('cdn/stories', {
            ...params,
            version: contentVersion(isPreview),
            per_page: 100,
            language: lang,
          });

          for (let i = 0; i < data.length; i++) {
            const story = data[i];
            const id = `${story.uuid}-${lang}`;
            const result = await parseData({
              id,
              data: {
                lang: story.lang === 'default' ? DEFAULT_LANGUAGE : story.lang,
                // Without the language, keeping folders: `about`, `blog` (start page), `blog/x`
                slug:
                  storySlug(story.full_slug, AVAILABLE_LANGUAGES) ?? story.slug,
                createdAt: new Date(story.created_at),
                publishedAt: story.first_published_at
                  ? new Date(story.first_published_at)
                  : undefined,
                updatedAt: story.updated_at
                  ? new Date(story.updated_at)
                  : undefined,
                content: story.content,
              },
            });

            store.set({
              id,
              data: result,
              digest: generateDigest(result),
            });
          }

          meta.set('lastModified', new Date().toISOString());
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : JSON.stringify(error);
        logger.error(`Unable to fetch ${name}:${message}`);
        // Fail the build rather than ship (and sync to S3) a site with no content
        if (!isDev) throw error;
      }
    },
    schema: z.object({
      lang: z.string(),
      slug: z.string(),
      createdAt: z.date(),
      publishedAt: z.date().optional(),
      updatedAt: z.date().optional(),
      content: z.unknown(),
    }),
  };
}
