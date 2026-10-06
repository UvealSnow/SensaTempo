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

// Stories under layout/ and the component of their content type
export const NAVBAR = { slug: 'layout/navbar', component: 'Navbar' } as const;
export const FOOTER = { slug: 'layout/footer', component: 'Footer' } as const;
type LayoutStory = typeof NAVBAR | typeof FOOTER;

const PAGE_COMPONENT = 'page';

/**
 * The Visual Editor's live updates POST whichever story is being edited (see @storyblok/astro
 * livePreview), so a payload only stands in for the story of the same component: editing the
 * navbar must not replace the page body, and vice versa.
 */
async function getPayloadContent(
  locals: APIContext['locals'],
  component: string
): Promise<SbBlokData | null> {
  const { story } = await getPayload({ locals });
  return story?.content?.component === component ? story.content : null;
}

/** Draft of `slug` in `lang` from the API, or null if it doesn't exist. */
async function fetchDraft(
  slug: string,
  lang: string,
  params: { resolve_links?: 'story' } = {}
): Promise<SbBlokData | null> {
  try {
    const { data } = await storyblokApi.getStory(slug, {
      ...params,
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

  return (
    (await getPayloadContent(locals, PAGE_COMPONENT)) ??
    (await fetchDraft(slug, lang))
  );
}

/**
 * Content of a layout story (e.g. `NAVBAR`) in `lang`, or null while it's missing or unpublished.
 * Same sources as getStoryContent, from the `layout` collection; multilinks come back resolved.
 */
export async function getLayoutStory(
  locals: APIContext['locals'],
  lang: string,
  { slug, component }: LayoutStory
): Promise<SbBlokData | null> {
  if (!isPreview) {
    const stories = await getCollection('layout');
    const story = stories.find(
      ({ data }) =>
        data.lang === lang &&
        (data.content as SbBlokData | undefined)?.component === component
    );
    return story ? (story.data.content as SbBlokData) : null;
  }

  return (
    (await getPayloadContent(locals, component)) ??
    (await fetchDraft(slug, lang, { resolve_links: 'story' }))
  );
}
