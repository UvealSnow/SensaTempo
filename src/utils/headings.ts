// Page headings from Storyblok content. Pure so `node --test` can run headings.test.ts directly.

interface PageContent {
  title?: unknown;
  body?: unknown;
}

const textBlocks = (content: PageContent | null | undefined) =>
  (Array.isArray(content?.body) ? content.body : []).filter(
    (blok): blok is { heading?: string; heading_level?: string } =>
      blok?.component === 'text' &&
      typeof blok.heading === 'string' &&
      Boolean(blok.heading.trim())
  );

/** The page's name for `<title>`: its `title` field, else its first text block heading. */
export function pageTitle(
  content: PageContent | null | undefined
): string | undefined {
  if (typeof content?.title === 'string' && content.title.trim())
    return content.title.trim();
  return textBlocks(content)[0]?.heading?.trim();
}

/** Whether the page renders an `<h1>`: its `title` (ArticleHeader) or a text block with level h1. */
export function hasHeadingOne(
  content: PageContent | null | undefined
): boolean {
  if (typeof content?.title === 'string' && content.title.trim()) return true;
  return textBlocks(content).some((blok) => blok.heading_level === 'h1');
}
