import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  byYearDesc,
  projectPath,
  projectSlug,
  projectsStrings,
  projectSummaries,
} from './projects.ts';
import { LANGUAGES } from './fixtures.ts';

const project = (slug: string, year?: string, title = slug) => ({
  uuid: slug,
  full_slug: slug,
  content: { component: 'project', title, excerpt: 'x', year },
});

test('projectSlug only accepts direct children of the folder', () => {
  assert.equal(projectSlug('projects/a', LANGUAGES), 'a');
  assert.equal(projectSlug('en/projects/a', LANGUAGES), 'a');
  assert.equal(projectSlug('projects/', LANGUAGES), null);
  assert.equal(projectSlug('projects/a/b', LANGUAGES), null);
  assert.equal(projectSlug('blog/post/a', LANGUAGES), null);
});

test('projectPath', () => {
  assert.equal(projectPath('en', 'a'), '/en/projects/a/');
});

test('projectSummaries drops the start page, other types and untitled projects', () => {
  const summaries = projectSummaries(
    [
      project('en/projects/a', ' 2025 '),
      { full_slug: 'projects/', content: { component: 'projects_index' } },
      { full_slug: 'projects/b', content: { component: 'project' } },
      { full_slug: 'about', content: { component: 'page', title: 'About' } },
      'uuid',
      null,
    ],
    LANGUAGES
  );
  assert.deepEqual(
    summaries.map(({ slug, year }) => [slug, year]),
    [['a', '2025']]
  );
});

test('byYearDesc sorts by the latest year, undated last, then by title', () => {
  const sorted = projectSummaries(
    [
      project('projects/old', '2020'),
      project('projects/none', undefined, 'B'),
      project('projects/range', '2023–2025'),
      project('projects/none2', '', 'A'),
      project('projects/new', '2024'),
    ],
    LANGUAGES
  ).sort(byYearDesc);
  assert.deepEqual(
    sorted.map(({ slug }) => slug),
    ['range', 'new', 'old', 'none2', 'none']
  );
});

test('projectsStrings falls back per language and per empty field', () => {
  assert.equal(projectsStrings(null, 'es').title, 'Proyectos');
  assert.equal(projectsStrings({ title: ' ' }, 'en').title, 'Projects');
  assert.equal(projectsStrings({ title: 'Work' }, 'fr').title, 'Work');
});
