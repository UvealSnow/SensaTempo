import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  byDateDesc,
  parseStoryblokDate,
  postPath,
  postSlug,
  postSummaries,
  refSummaries,
} from './posts.ts';
import { LANGUAGES } from './fixtures.ts';

const post = (slug: string, date?: string, first?: string) => ({
  full_slug: slug,
  first_published_at: first ?? null,
  content: { component: 'post', title: slug, excerpt: 'x', date },
});

test('parseStoryblokDate reads Storyblok datetimes as UTC', () => {
  assert.equal(
    parseStoryblokDate('2026-07-16 00:00')?.toISOString(),
    '2026-07-16T00:00:00.000Z'
  );
  assert.equal(
    parseStoryblokDate('2026-10-06T21:26:55.173Z')?.toISOString(),
    '2026-10-06T21:26:55.173Z'
  );
  assert.equal(parseStoryblokDate(''), null);
  assert.equal(parseStoryblokDate('nope'), null);
});

test('postSummaries keeps the editor order and drops unresolved entries', () => {
  const summaries = postSummaries(
    [
      post('en/blog/post/b', '2026-01-01 00:00'),
      'a1b2c3-uuid-of-an-unpublished-post',
      null,
      { full_slug: 'about', content: { component: 'page', title: 'About' } },
      { ...post('blog/post/untitled'), content: { component: 'post' } },
      post('blog/outside-the-folder', '2026-01-01 00:00'),
      post('blog/post/a', '', '2026-02-01T10:00:00.000Z'),
    ],
    LANGUAGES
  );
  assert.deepEqual(
    summaries.map(({ slug }) => slug),
    ['b', 'a']
  );
  assert.equal(summaries[1].date?.toISOString(), '2026-02-01T10:00:00.000Z');
  assert.deepEqual(postSummaries(undefined, LANGUAGES), []);
});

test('byDateDesc puts the newest first and undated posts last', () => {
  const summaries = postSummaries(
    [
      post('blog/post/old', '2025-01-01 00:00'),
      post('blog/post/undated'),
      post('blog/post/new', '2026-01-01 00:00'),
    ],
    LANGUAGES
  );
  assert.deepEqual(
    summaries.sort(byDateDesc).map(({ slug }) => slug),
    ['new', 'old', 'undated']
  );
});

test('postPath and postSlug map posts to /{lang}/blog/post/{slug}/', () => {
  assert.equal(postPath('es', 'luz-de-vitral'), '/es/blog/post/luz-de-vitral/');
  assert.equal(postSlug('blog/post/x', LANGUAGES), 'x');
  assert.equal(postSlug('en/blog/post/x/', LANGUAGES), 'x');
  assert.equal(postSlug('blog/x', LANGUAGES), null);
  assert.equal(postSlug('blog/post/', LANGUAGES), null);
  assert.equal(postSlug('blog/post/a/b', LANGUAGES), null);
});

test('postSummaries joins the author and tags and prefers published_at', () => {
  const authors = [{ uuid: 'a1', slug: 'ana', name: 'Ana' }];
  const tags = [
    { uuid: 't1', slug: 'luz', name: 'Luz' },
    { uuid: 't2', slug: 'calle', name: 'Calle' },
  ];
  const [summary, unknownAuthor] = postSummaries(
    [
      {
        uuid: 'p1',
        full_slug: 'blog/post/x',
        content: {
          component: 'post',
          title: 'X',
          published_at: '2025-05-01 00:00',
          date: '2020-01-01 00:00',
          cover_description: 'Arcos',
          cover_taken_at: '2025-04-30 00:00',
          author: 'a1',
          tags: ['t2', 'gone', 't1'],
        },
      },
      {
        uuid: 'p2',
        full_slug: 'blog/post/y',
        content: { component: 'post', title: 'Y', author: 'gone' },
      },
    ],
    LANGUAGES,
    { authors, tags }
  );
  assert.equal(summary.uuid, 'p1');
  assert.equal(summary.date?.toISOString(), '2025-05-01T00:00:00.000Z');
  assert.equal(summary.author?.slug, 'ana');
  assert.deepEqual(
    summary.tags.map(({ slug }) => slug),
    ['calle', 'luz']
  );
  assert.equal(summary.coverDescription, 'Arcos');
  assert.equal(summary.coverTakenAt?.toISOString(), '2025-04-30T00:00:00.000Z');
  assert.equal(unknownAuthor.author, undefined);
  assert.deepEqual(unknownAuthor.tags, []);
  assert.equal(unknownAuthor.coverTakenAt, null);
});

test('refSummaries reads authors and tags in their folder', () => {
  const refs = refSummaries(
    [
      { uuid: 't1', full_slug: 'en/blog/tag/luz', content: { name: 'Light' } },
      { uuid: 't2', full_slug: 'blog/tag/sin-nombre', content: {} },
      { uuid: 't3', full_slug: 'blog/post/x', content: { name: 'X' } },
      { full_slug: 'blog/tag/no-uuid', content: { name: 'N' } },
    ],
    'blog/tag',
    LANGUAGES
  );
  assert.deepEqual(refs, [{ uuid: 't1', slug: 'luz', name: 'Light' }]);
});
