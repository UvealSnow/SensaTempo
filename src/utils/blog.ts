// Pure (no `~` or astro imports) so `node --test` can run blog.test.ts directly.
import dayjs from './dates.ts';

export const POSTS_PER_PAGE = 10;

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
}

/** Null when `page` is out of range; no items is still one (empty) page. */
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

export function parsePage(param: string | undefined): number | null {
  if (param === undefined || param === '') return 1;
  return /^[1-9]\d*$/.test(param) ? Number(param) : null;
}

export const pagePathOf = (basePath: string, page: number): string =>
  page <= 1 ? basePath : `${basePath}${page}/`;

/** `null` marks an ellipsis; a one-page gap shows the page instead. */
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

export function blogFeed<T extends { uuid: string }>(
  posts: readonly T[],
  featuredUuids: readonly unknown[] | undefined
): T[] {
  const featured = new Set(featuredUuids ?? []);
  return posts.filter(({ uuid }) => !featured.has(uuid));
}

const FALLBACK_STRINGS = {
  es: {
    title: 'Blog',
    description: '',
    quick_links_label: 'Enlaces rápidos',
    featured_label: 'Destacados',
    archive_label: 'Archivo',
    all_posts_label: 'Todas las entradas',
    by_label: 'Por',
    read_more_label: 'Leer artículo completo',
    previous_label: 'Anterior',
    next_label: 'Siguiente',
    page_label: 'Página',
    pagination_label: 'Paginación',
    archive_title: 'Archivo: {month} {year}',
    archive_description: 'Entradas publicadas en {month} de {year}.',
  },
  en: {
    title: 'Blog',
    description: '',
    quick_links_label: 'Quick links',
    featured_label: 'Featured posts',
    archive_label: 'Archive',
    all_posts_label: 'All posts',
    by_label: 'By',
    read_more_label: 'Read full article',
    previous_label: 'Previous',
    next_label: 'Next',
    page_label: 'Page',
    pagination_label: 'Pagination',
    archive_title: 'Archive: {month} {year}',
    archive_description: 'Posts published in {month} {year}.',
  },
};

export type BlogStrings = typeof FALLBACK_STRINGS.en;

export function blogStrings(
  blok: Record<string, unknown> | null | undefined,
  lang: string
): BlogStrings {
  const fallback =
    FALLBACK_STRINGS[lang as keyof typeof FALLBACK_STRINGS] ??
    FALLBACK_STRINGS.en;
  const keys = Object.keys(fallback) as (keyof BlogStrings)[];
  return Object.fromEntries(
    keys.map((key) => {
      const value = blok?.[key];
      return [
        key,
        typeof value === 'string' && value.trim() ? value : fallback[key],
      ];
    })
  ) as BlogStrings;
}

export const fillTemplate = (
  template: string,
  values: Record<string, string | number>
): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  );
