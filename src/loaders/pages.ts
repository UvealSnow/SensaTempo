import type { LoaderContext, Loader } from 'astro/loaders'
import { apiPlugin, storyblokInit } from '@storyblok/js'
import { z } from 'astro:content'
import { loadEnv } from 'vite';

const env = loadEnv('', process.cwd(), 'STORYBLOK');
const isDev = import.meta.env.DEV

export function pagesLoader(): Loader {
  return {
    name: 'storyblok-paged-loader',
    load: async ({
      meta,
      store,
      logger,
      parseData,
      generateDigest,
    }: LoaderContext): Promise<void> => {
      try {
        const { storyblokApi } = storyblokInit({
          accessToken: env.STORYBLOK_ACCESS_TOKEN,
          use: [apiPlugin]
        })

        if (!storyblokApi) {
          throw new Error('Unable to init StoryBlok api')
        }

        logger.info('Loading collection - pages')
        logger.info(`Collection last modified ${meta.get('lastModified')}`)

        const data = await storyblokApi.getAll('cdn/stories', {
          version: isDev ? 'draft' : 'published',
          content_type: 'page',
          per_page: 100,
        })

        if (isDev) store.clear()
        for (let i = 0; i < data.length; i++) {
          const story = data[i]
          const result = await parseData({
            id: story.uuid,
            data: {
              lang: story.lang,
              slug: story.full_slug,
              createdAt: new Date(story.created_at),
              updatedAt: !!story.updated_at ? new Date(story.updated_at) : undefined,
              content: story.content,
            }
          })

          store.set({
            id: story.uuid,
            data: result,
            digest: generateDigest(result)
          }) 
        }

        meta.set('lastModified', new Date().toISOString())
      } catch (error) {
        logger.error(`Unable to fetch pages -> ${error}`)
      }
    },
    schema: async () => z.object({
      lang: z.string(),
      slug: z.string(),
      createdAt: z.date(),
      updatedAt: z.date().optional(),
      content: z.unknown(),
    })
  }
}