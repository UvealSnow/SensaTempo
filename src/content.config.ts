import { defineCollection } from 'astro:content';
import { storiesLoader } from './loaders/stories';
import {
  AUTHORS_FOLDER,
  BLOG_FOLDER,
  PAGE_RELATIONS,
  POSTS_FOLDER,
  TAGS_FOLDER,
} from './utils/posts';
import { PROJECTS_FOLDER } from './utils/projects';

const pages = defineCollection({
  loader: storiesLoader('pages', {
    content_type: 'page',
    resolve_relations: PAGE_RELATIONS,
  }),
});

const posts = defineCollection({
  loader: storiesLoader('posts', {
    content_type: 'post',
    starts_with: `${POSTS_FOLDER}/`,
    resolve_links: 'story',
  }),
});

const authors = defineCollection({
  loader: storiesLoader('authors', {
    content_type: 'author',
    starts_with: `${AUTHORS_FOLDER}/`,
  }),
});

const tags = defineCollection({
  loader: storiesLoader('tags', {
    content_type: 'tag',
    starts_with: `${TAGS_FOLDER}/`,
  }),
});

const blogIndex = defineCollection({
  loader: storiesLoader('blog-index', {
    content_type: 'blog_index',
    starts_with: `${BLOG_FOLDER}/`,
  }),
});

const projects = defineCollection({
  loader: storiesLoader('projects', {
    content_type: 'project',
    starts_with: `${PROJECTS_FOLDER}/`,
  }),
});

const projectsIndex = defineCollection({
  loader: storiesLoader('projects-index', {
    content_type: 'projects_index',
    starts_with: `${PROJECTS_FOLDER}/`,
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
  authors,
  tags,
  blogIndex,
  projects,
  projectsIndex,
  layout,
};
