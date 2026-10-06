import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { AVAILABLE_LANGUAGES, SITE_DESCRIPTION, SITE_TITLE } from '~/consts';
import { pagePath } from '~/utils/navigation';
import { getPosts } from '~/utils/stories';

// Static build only; the preview server renders every request
export function getStaticPaths() {
  return AVAILABLE_LANGUAGES.map((lang) => ({ params: { lang } }));
}

/** Every post in the language, newest first (not the blog page's curated list). */
export const GET: APIRoute = async ({ params, site }) => {
  const lang = params.lang ?? '';
  if (!AVAILABLE_LANGUAGES.includes(lang) || !site) {
    return new Response(null, { status: 404 });
  }

  const posts = await getPosts(lang);
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site,
    customData: `<language>${lang}</language>`,
    items: posts.map((post) => ({
      title: post.title,
      description: post.excerpt,
      pubDate: post.date ?? undefined,
      link: pagePath(lang, post.slug),
    })),
  });
};
