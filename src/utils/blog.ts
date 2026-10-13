// Blog indexes: pagination, archive months and filtered feeds. Pure functions (no `~` or astro
// imports) so `node --test` can run blog.test.ts directly.
import dayjs from './dates.ts';

export const POSTS_PER_PAGE = 10;

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
}

/**
 * Page `page` (1-based) of `items`, or null when it's out of range. With no items there's still one
 * (empty) page, so an index always renders.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  perPage = POSTS_PER_PAGE
): Paginated<T> | null {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  if (!Number.isInteger(page) || page < 1 || page > totalPages) return null;
  const start = (page - 1) * perPage;
  return { items: items.slice(start, start + perPage), page, totalPages };
}

/** Page number from a `[...page]` route param: none → 1, `2` → 2; anything else (`0`, `01`, `x`) → null. */
export function parsePage(param: string | undefined): number | null {
  if (param === undefined || param === '') return 1;
  return /^[1-9]\d*$/.test(param) ? Number(param) : null;
}

/** URL of page `page` of an index at `basePath` (`/es/blog/`): page 1 is the bare path. */
export const pagePathOf = (basePath: string, page: number): string =>
  page <= 1 ? basePath : `${basePath}${page}/`;

/**
 * Page numbers for the paginator, `null` for an ellipsis: the first and last pages, and the current
 * one with its neighbours. A gap of a single page shows that page instead of an ellipsis.
 */
export function pageNumbers(current: number, total: number): (number | null)[] {
  const shown = new Set(
    [1, total, current - 1, current, current + 1].filter(
      (page) => page >= 1 && page <= total
    )
  );
  const sorted = [...shown].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((page, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && page - previous === 2) result.push(page - 1);
    else if (previous !== undefined && page - previous > 2) result.push(null);
    result.push(page);
  });
  return result;
}

interface Dated {
  date: Date | null;
}

export interface ArchiveYear {
  year: number;
  months: { month: number; count: number }[];
}

/** Years and months (1–12, UTC) that have posts, with their post counts; newest first. */
export function archiveTree(posts: readonly Dated[]): ArchiveYear[] {
  const counts = new Map<number, Map<number, number>>();
  for (const { date } of posts) {
    if (!date) continue;
    const day = dayjs.utc(date);
    const months = counts.get(day.year()) ?? new Map<number, number>();
    months.set(day.month() + 1, (months.get(day.month() + 1) ?? 0) + 1);
    counts.set(day.year(), months);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort(([a], [b]) => b - a)
        .map(([month, count]) => ({ month, count })),
    }));
}

/** Posts dated in `month` (1–12) of `year`, UTC; keeps their order. */
export function postsInMonth<T extends Dated>(
  posts: readonly T[],
  year: number,
  month: number
): T[] {
  return posts.filter(({ date }) => {
    if (!date) return false;
    const day = dayjs.utc(date);
    return day.year() === year && day.month() + 1 === month;
  });
}

interface WithRefs {
  uuid: string;
  author?: { uuid: string };
  tags: { uuid: string }[];
}

export const postsByTag = <T extends WithRefs>(
  posts: readonly T[],
  uuid: string
): T[] => posts.filter(({ tags }) => tags.some((tag) => tag.uuid === uuid));

export const postsByAuthor = <T extends WithRefs>(
  posts: readonly T[],
  uuid: string
): T[] => posts.filter(({ author }) => author?.uuid === uuid);

/** `items` with these uuids, in the uuids' order (the editor's); missing or unpublished ones are skipped. */
export function pickByUuid<T extends { uuid: string }>(
  uuids: readonly unknown[] | undefined,
  items: readonly T[]
): T[] {
  const byUuid = new Map(items.map((item) => [item.uuid, item]));
  return (uuids ?? []).flatMap((uuid) => {
    const item = typeof uuid === 'string' ? byUuid.get(uuid) : undefined;
    return item ? [item] : [];
  });
}

/** The `/blog` card feed: every post except the featured ones (those only show in the sidebar). */
export function blogFeed<T extends { uuid: string }>(
  posts: readonly T[],
  featuredUuids: readonly unknown[] | undefined
): T[] {
  const featured = new Set(featuredUuids ?? []);
  return posts.filter(({ uuid }) => !featured.has(uuid));
}
