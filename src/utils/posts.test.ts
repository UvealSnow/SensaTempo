import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { byDateDesc, parseStoryblokDate, postSummaries } from './posts.ts';
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
      post('en/blog/b', '2026-01-01 00:00'),
      'a1b2c3-uuid-of-an-unpublished-post',
      null,
      { full_slug: 'about', content: { component: 'page', title: 'About' } },
      { ...post('blog/untitled'), content: { component: 'post' } },
      post('blog/a', '', '2026-02-01T10:00:00.000Z'),
    ],
    LANGUAGES
  );
  assert.deepEqual(
    summaries.map(({ slug }) => slug),
    ['blog/b', 'blog/a']
  );
  assert.equal(summaries[1].date?.toISOString(), '2026-02-01T10:00:00.000Z');
  assert.deepEqual(postSummaries(undefined, LANGUAGES), []);
});

test('byDateDesc puts the newest first and undated posts last', () => {
  const summaries = postSummaries(
    [
      post('blog/old', '2025-01-01 00:00'),
      post('blog/undated'),
      post('blog/new', '2026-01-01 00:00'),
    ],
    LANGUAGES
  );
  assert.deepEqual(
    summaries.sort(byDateDesc).map(({ slug }) => slug),
    ['blog/new', 'blog/old', 'blog/undated']
  );
});
