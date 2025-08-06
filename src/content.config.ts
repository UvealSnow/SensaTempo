import { defineCollection } from 'astro:content';
import { pagesLoader } from './loaders/pages';

const pages = defineCollection({
  loader: pagesLoader(),
});

export const collections = {
  pages,
};
