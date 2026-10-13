// Project summaries and UI strings. Pure functions (no `~` or astro imports) so
// `node --test` can run projects.test.ts directly.
import type { StoryblokAsset } from './images.ts';
import { storySlug } from './navigation.ts';
import { parseStoryblokDate } from './posts.ts';

// Entries live directly in the folder; its start page is the `projects_index` story
export const PROJECTS_FOLDER = 'projects';

interface ProjectStory {
  uuid?: string;
  full_slug?: string;
  content?: {
    component?: string;
    title?: string;
    excerpt?: string;
    cover?: StoryblokAsset;
    cover_description?: string;
    cover_taken_at?: string;
    year?: string;
  };
}

export interface ProjectSummary {
  uuid: string;
  slug: string;
  title: string;
  excerpt: string;
  cover?: StoryblokAsset;
  coverDescription?: string;
  coverTakenAt: Date | null;
  year: string;
}

export const projectPath = (lang: string, slug: string): string =>
  `/${lang}/${PROJECTS_FOLDER}/${slug}/`;

export function projectSlug(
  fullSlug: string,
  languages: readonly string[]
): string | null {
  const slug = storySlug(fullSlug, languages);
  const prefix = `${PROJECTS_FOLDER}/`;
  if (!slug?.startsWith(prefix)) return null;
  const rest = slug.slice(prefix.length);
  return rest && !rest.includes('/') ? rest : null;
}

/** Summaries of `entries`, skipping anything that isn't a titled project in the folder. */
export function projectSummaries(
  entries: readonly unknown[] | undefined,
  languages: readonly string[]
): ProjectSummary[] {
  return (entries ?? []).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const story = entry as ProjectStory;
    const slug = projectSlug(story.full_slug ?? '', languages);
    const content = story.content;
    if (!slug || content?.component !== 'project' || !content.title) return [];
    return [
      {
        uuid: story.uuid ?? '',
        slug,
        title: content.title,
        excerpt: content.excerpt ?? '',
        cover: content.cover,
        coverDescription: content.cover_description || undefined,
        coverTakenAt: parseStoryblokDate(content.cover_taken_at),
        year: content.year?.trim() ?? '',
      },
    ];
  });
}

/** Newest year first (`2024–2025` counts as 2025); undated projects last; then by title. */
export function byYearDesc(a: ProjectSummary, b: ProjectSummary): number {
  const year = ({ year }: ProjectSummary) =>
    Math.max(-Infinity, ...(year.match(/\d{4}/g) ?? []).map(Number));
  return year(b) - year(a) || a.title.localeCompare(b.title);
}

const FALLBACK_STRINGS = {
  es: {
    title: 'Proyectos',
    description: '',
    read_more_label: 'Ver proyecto',
    empty_label: 'Todavía no hay proyectos.',
  },
  en: {
    title: 'Projects',
    description: '',
    read_more_label: 'View project',
    empty_label: 'No projects yet.',
  },
};

export type ProjectsStrings = typeof FALLBACK_STRINGS.en;

export function projectsStrings(
  blok: Record<string, unknown> | null | undefined,
  lang: string
): ProjectsStrings {
  const fallback =
    FALLBACK_STRINGS[lang as keyof typeof FALLBACK_STRINGS] ??
    FALLBACK_STRINGS.en;
  const keys = Object.keys(fallback) as (keyof ProjectsStrings)[];
  return Object.fromEntries(
    keys.map((key) => {
      const value = blok?.[key];
      return [
        key,
        typeof value === 'string' && value.trim() ? value : fallback[key],
      ];
    })
  ) as ProjectsStrings;
}
