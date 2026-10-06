// Blog post summaries for lists and feeds. Pure functions (no `~` or astro imports) so
// `node --test` can run posts.test.ts directly.
import type { StoryblokAsset } from './images.ts';
import { storySlug } from './navigation.ts';

// Posts live in this Storyblok folder, whose start page is the blog page
export const BLOG_FOLDER = 'blog';

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

/** Storyblok datetimes are `YYYY-MM-DD HH:mm` in UTC. */
export function parseStoryblokDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
      ? `${value.replace(' ', 'T')}:00Z`
      : value
  );
  return Number.isNaN(date.getTime()) ? null : date;
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
    const slug = storySlug(story.full_slug ?? '', languages);
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
