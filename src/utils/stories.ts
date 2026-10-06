import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import {
  getPayload,
  type ISbStoryData,
  type SbBlokData,
} from '@storyblok/astro';
import { storyblokApi } from '@storyblok/astro/client';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from '~/consts';
import {
  BLOG_FOLDER,
  byDateDesc,
  PAGE_RELATIONS,
  postSummaries,
  type PostSummary,
} from './posts';
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
const POST_COMPONENT = 'post';
interface StoryParams {
  resolve_links?: 'story';
  resolve_relations?: string[];
}

/**
 * The Visual Editor's live updates POST whichever story is being edited (see @storyblok/astro
 * livePreview), so a payload only stands in for the story of the same component: editing the
 * navbar must not replace the page body, and vice versa.
 */
async function getPayloadStory(
  locals: APIContext['locals'],
  component: string
): Promise<ISbStoryData | null> {
  const { story } = await getPayload({ locals });
  return story?.content?.component === component ? story : null;
}

const languageParam = (lang: string) =>
  lang === DEFAULT_LANGUAGE ? undefined : lang;

// Read at request time so the Lambda env (from SSM) wins over the token baked in at build
const previewToken = () =>
  process.env.STORYBLOK_PREVIEW_TOKEN?.trim() || undefined;

/** Draft of `slug` in `lang` from the API, or null if it doesn't exist. */
async function fetchDraft(
  slug: string,
  lang: string,
  params: StoryParams = {}
): Promise<ISbStoryData | null> {
  try {
    const { data } = await storyblokApi.getStory(slug, {
      ...params,
      version: 'draft',
      language: languageParam(lang),
      token: previewToken(),
    });
    return data.story;
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

  const story =
    (await getPayloadStory(locals, PAGE_COMPONENT)) ??
    (await fetchDraft(slug, lang, { resolve_relations: PAGE_RELATIONS }));
  return story?.content ?? null;
}

/** A post's content and first publish date (the fallback for its `date` field). */
export interface Post {
  content: SbBlokData;
  publishedAt: string | null;
}

/** The post `blog/<slug>` in `lang`, or null if it doesn't exist. Same sources as getStoryContent. */
export async function getPost(
  locals: APIContext['locals'],
  lang: string,
  slug: string
): Promise<Post | null> {
  const fullSlug = `${BLOG_FOLDER}/${slug}`;

  if (!isPreview) {
    const posts = await getCollection('posts');
    const post = posts.find(
      ({ data }) => data.lang === lang && data.slug === fullSlug
    );
    return post
      ? {
          content: post.data.content as SbBlokData,
          publishedAt: post.data.publishedAt?.toISOString() ?? null,
        }
      : null;
  }

  const story =
    (await getPayloadStory(locals, POST_COMPONENT)) ??
    (await fetchDraft(fullSlug, lang));
  return story
    ? { content: story.content, publishedAt: story.first_published_at ?? null }
    : null;
}

/** Every post in `lang`, newest first (for feeds; the blog page lists the editor's choice). */
export async function getPosts(lang: string): Promise<PostSummary[]> {
  let stories: unknown[];
  if (!isPreview) {
    const posts = await getCollection('posts');
    stories = posts
      .filter(({ data }) => data.lang === lang)
      .map(({ data }) => ({
        full_slug: data.slug,
        first_published_at: data.publishedAt?.toISOString(),
        content: data.content,
      }));
  } else {
    stories = await storyblokApi.getAll('cdn/stories', {
      content_type: POST_COMPONENT,
      starts_with: `${BLOG_FOLDER}/`,
      version: 'draft',
      language: languageParam(lang),
      token: previewToken(),
    });
  }
  return postSummaries(stories, AVAILABLE_LANGUAGES).sort(byDateDesc);
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

  const story =
    (await getPayloadStory(locals, component)) ??
    (await fetchDraft(slug, lang, { resolve_links: 'story' }));
  return story?.content ?? null;
}
