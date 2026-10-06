import { defineCollection } from 'astro:content';
import { storiesLoader } from './loaders/stories';

const pages = defineCollection({
  loader: storiesLoader('pages', { content_type: 'page' }),
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
  layout,
};
