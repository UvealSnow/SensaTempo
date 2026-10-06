import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getPayload, type SbBlokData } from '@storyblok/astro';
import { storyblokApi } from '@storyblok/astro/client';
import { DEFAULT_LANGUAGE } from '~/consts';
import { isPreviewMode } from './storyblok';

export const isPreview = isPreviewMode(
  import.meta.env.DEV,
  import.meta.env.PUBLIC_BUILD_TYPE
);

/**
 * Content of the story `slug` in `lang`, or null if it doesn't exist.
 * Preview fetches the draft per request so editors see unsaved changes; the static build reads the
 * published `pages` collection loaded at build time.
 */
export async function getStoryContent(
  locals: APIContext['locals'],
  lang: string,
  slug: string
): Promise<SbBlokData | null> {
  if (!isPreview) {
    const pages = await getCollection('pages');
    const page = pages.find(
      ({ data }) => data.lang === lang && data.slug === slug
    );
    return page ? (page.data.content as SbBlokData) : null;
  }

  // Visual Editor live updates POST the story being edited (see @storyblok/astro livePreview)
  const { story } = await getPayload({ locals });
  if (story) return story.content;

  try {
    const { data } = await storyblokApi.getStory(slug, {
      version: 'draft',
      language: lang === DEFAULT_LANGUAGE ? undefined : lang,
      // Read at request time so the Lambda env (from SSM) wins over the token baked in at build
      token: process.env.STORYBLOK_PREVIEW_TOKEN?.trim() || undefined,
    });
    return data.story.content;
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}
