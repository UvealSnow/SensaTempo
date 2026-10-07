import { defineCollection } from 'astro:content';
import { storiesLoader } from './loaders/stories';
import { BLOG_FOLDER, PAGE_RELATIONS } from './utils/posts';

const pages = defineCollection({
  loader: storiesLoader('pages', {
    content_type: 'page',
    resolve_relations: PAGE_RELATIONS,
  }),
});

const posts = defineCollection({
  loader: storiesLoader('posts', {
    content_type: 'post',
    starts_with: `${BLOG_FOLDER}/`,
    resolve_links: 'story',
  }),
});

// Navbar, footer…: one story each under layout/, looked up by component (see getLayoutStory)
const layout = defineCollection({
  loader: storiesLoader('layout', {
    starts_with: 'layout/',
    // Multilinks get the linked story, so hrefs follow its current full_slug
    resolve_links: 'story',
  }),
});

export const collections = {
  pages,
  posts,
  layout,
};
