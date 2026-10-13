// Blog post summaries for lists and feeds. Pure functions (no `~` or astro imports) so
// `node --test` can run posts.test.ts directly.
import dayjs from './dates.ts';
import type { StoryblokAsset } from './images.ts';
import { storySlug } from './navigation.ts';

export const BLOG_FOLDER = 'blog';
export const POSTS_FOLDER = `${BLOG_FOLDER}/post`;

// Relations to resolve wherever pages are fetched: `post_list` blocks come back with their posts
export const PAGE_RELATIONS = ['post_list.posts'];

// The parts of a `post` story a list needs (a resolved `post_list.posts` entry, or a loaded story)
export interface PostStory {
  full_slug?: string;
  first_published_at?: string | null;
  content?: {
    component?: string;
    title?: string;
    excerpt?: string;
    cover?: StoryblokAsset;
    date?: string;
  };
}

export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  cover?: StoryblokAsset;
  date: Date | null;
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

/** The post's date: the editor's `date`, else its first publish. */
export const postDate = (
  date?: string | null,
  firstPublishedAt?: string | null
): Date | null =>
  parseStoryblokDate(date) ?? parseStoryblokDate(firstPublishedAt);

/**
 * Summaries of `entries` in their given order. Entries that aren't resolved posts (unpublished or
 * deleted stories come back as bare uuids, or not at all) or have no title are skipped.
 */
export function postSummaries(
  entries: readonly unknown[] | undefined,
  languages: readonly string[]
): PostSummary[] {
  return (entries ?? []).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const story = entry as PostStory;
    const slug = postSlug(story.full_slug ?? '', languages);
    const content = story.content;
    if (!slug || content?.component !== 'post' || !content.title) return [];
    return [
      {
        slug,
        title: content.title,
        excerpt: content.excerpt ?? '',
        cover: content.cover,
        date: postDate(content.date, story.first_published_at),
      },
    ];
  });
}

/** Newest first; undated posts last. */
export function byDateDesc(a: PostSummary, b: PostSummary): number {
  const time = (post: PostSummary) => post.date?.getTime() ?? -Infinity;
  if (time(a) === time(b)) return 0;
  return time(b) > time(a) ? 1 : -1;
}
