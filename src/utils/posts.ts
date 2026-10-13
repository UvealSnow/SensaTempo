// Blog post summaries for lists and feeds. Pure functions (no `~` or astro imports) so
// `node --test` can run posts.test.ts directly.
import dayjs from './dates.ts';
import type { StoryblokAsset } from './images.ts';
import { storySlug } from './navigation.ts';

export const BLOG_FOLDER = 'blog';
export const POSTS_FOLDER = `${BLOG_FOLDER}/post`;

// Relations to resolve wherever pages are fetched: `post_list` blocks come back with their posts
export const PAGE_RELATIONS = ['post_list.posts'];

export const AUTHORS_FOLDER = `${BLOG_FOLDER}/author`;
export const TAGS_FOLDER = `${BLOG_FOLDER}/tag`;

// The parts of a `post` story a list needs (a resolved `post_list.posts` entry, or a loaded story)
export interface PostStory {
  uuid?: string;
  full_slug?: string;
  first_published_at?: string | null;
  content?: {
    component?: string;
    title?: string;
    excerpt?: string;
    cover?: StoryblokAsset;
    cover_description?: string;
    cover_taken_at?: string;
    published_at?: string;
    // Replaced by `published_at`; read until the field is deleted
    date?: string;
    author?: string;
    tags?: string[];
  };
}

export interface Ref {
  uuid: string;
  slug: string;
  name: string;
}

export interface PostSummary {
  uuid: string;
  slug: string;
  title: string;
  excerpt: string;
  cover?: StoryblokAsset;
  coverDescription?: string;
  coverTakenAt: Date | null;
  date: Date | null;
  author?: Ref;
  tags: Ref[];
}

export const postPath = (lang: string, slug: string): string =>
  `/${lang}/${POSTS_FOLDER}/${slug}/`;

export function postSlug(
  fullSlug: string,
  languages: readonly string[]
): string | null {
  const slug = storySlug(fullSlug, languages);
  const prefix = `${POSTS_FOLDER}/`;
  if (!slug?.startsWith(prefix)) return null;
  const rest = slug.slice(prefix.length);
  return rest && !rest.includes('/') ? rest : null;
}

/** Storyblok datetimes (`YYYY-MM-DD HH:mm`) and timestamps are UTC. */
export function parseStoryblokDate(value?: string | null): Date | null {
  const date = value ? dayjs.utc(value) : null;
  return date?.isValid() ? date.toDate() : null;
}

/** The editor's publishing date, else the first publish. */
export const postDate = (
  date?: string | null,
  firstPublishedAt?: string | null
): Date | null =>
  parseStoryblokDate(date) ?? parseStoryblokDate(firstPublishedAt);

export interface PostRefs {
  authors?: readonly Ref[];
  tags?: readonly Ref[];
}

/**
 * Summaries of `entries` in their given order. Entries that aren't resolved posts (unpublished or
 * deleted stories come back as bare uuids, or not at all) or have no title are skipped.
 */
export function postSummaries(
  entries: readonly unknown[] | undefined,
  languages: readonly string[],
  refs: PostRefs = {}
): PostSummary[] {
  const authors = new Map(refs.authors?.map((ref) => [ref.uuid, ref]));
  const tags = new Map(refs.tags?.map((ref) => [ref.uuid, ref]));
  return (entries ?? []).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const story = entry as PostStory;
    const slug = postSlug(story.full_slug ?? '', languages);
    const content = story.content;
    if (!slug || content?.component !== 'post' || !content.title) return [];
    return [
      {
        uuid: story.uuid ?? '',
        slug,
        title: content.title,
        excerpt: content.excerpt ?? '',
        cover: content.cover,
        coverDescription: content.cover_description || undefined,
        coverTakenAt: parseStoryblokDate(content.cover_taken_at),
        date: postDate(
          content.published_at || content.date,
          story.first_published_at
        ),
        author: content.author ? authors.get(content.author) : undefined,
        tags: (content.tags ?? []).flatMap((uuid) => {
          const tag = tags.get(uuid);
          return tag ? [tag] : [];
        }),
      },
    ];
  });
}

export function refSummaries(
  entries: readonly unknown[] | undefined,
  folder: string,
  languages: readonly string[]
): Ref[] {
  return (entries ?? []).flatMap((entry) => {
    const story = entry as {
      uuid?: string;
      full_slug?: string;
      content?: { name?: string };
    };
    const slug = storySlug(story?.full_slug ?? '', languages);
    const name = story?.content?.name;
    if (!story?.uuid || !name || !slug?.startsWith(`${folder}/`)) return [];
    const own = slug.slice(folder.length + 1);
    return own && !own.includes('/')
      ? [{ uuid: story.uuid, slug: own, name }]
      : [];
  });
}

/** Newest first; undated posts last. */
export function byDateDesc(a: PostSummary, b: PostSummary): number {
  const time = (post: PostSummary) => post.date?.getTime() ?? -Infinity;
  if (time(a) === time(b)) return 0;
  return time(b) > time(a) ? 1 : -1;
}
