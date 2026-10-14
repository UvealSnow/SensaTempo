import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { AVAILABLE_LANGUAGES, SITE_DESCRIPTION, SITE_TITLE } from '~/consts';
import { postPath } from '~/utils/posts';
import { seoDefaults } from '~/utils/seo';
import { getLayoutStory, getPosts, SEO } from '~/utils/stories';

// Static build only; the preview server renders every request
export function getStaticPaths() {
  return AVAILABLE_LANGUAGES.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = async ({ params, site, locals }) => {
  const lang = params.lang ?? '';
  if (!AVAILABLE_LANGUAGES.includes(lang) || !site) {
    return new Response(null, { status: 404 });
  }

  const [posts, seo] = await Promise.all([
    getPosts(lang),
    getLayoutStory(locals, lang, SEO),
  ]);
  const defaults = seoDefaults(seo, {
    siteName: SITE_TITLE,
    description: SITE_DESCRIPTION,
  });
  return rss({
    title: defaults.siteName,
    description: defaults.description,
    site,
    customData: `<language>${lang}</language>`,
    items: posts.map((post) => ({
      title: post.title,
      description: post.excerpt,
      pubDate: post.date ?? undefined,
      link: postPath(lang, post.slug),
    })),
  });
};
