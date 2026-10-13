import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  archivePath,
  archiveTree,
  blogStrings,
  fillTemplate,
  blogFeed,
  pageNumbers,
  pagePathOf,
  paginate,
  parsePage,
  pickByUuid,
  postsByAuthor,
  postsByTag,
  postsInMonth,
} from './blog.ts';

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

test('paginate splits into pages of 10 and rejects pages out of range', () => {
  assert.deepEqual(paginate([], 1), { items: [], page: 1, totalPages: 1 });
  assert.equal(paginate([], 2), null);

  assert.equal(paginate(range(10), 1)?.totalPages, 1);
  assert.equal(paginate(range(10), 2), null);

  const second = paginate(range(11), 2);
  assert.deepEqual(second, { items: [11], page: 2, totalPages: 2 });
  assert.equal(paginate(range(11), 3), null);

  assert.equal(paginate(range(11), 0), null);
  assert.equal(paginate(range(11), 1.5), null);
  assert.deepEqual(paginate(range(5), 2, 2)?.items, [3, 4]);
});

test('parsePage reads route params; page 1 is the bare URL', () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage(''), 1);
  assert.equal(parsePage('1'), 1);
  assert.equal(parsePage('12'), 12);
  assert.equal(parsePage('0'), null);
  assert.equal(parsePage('01'), null);
  assert.equal(parsePage('x'), null);
  assert.equal(parsePage('2/3'), null);

  assert.equal(pagePathOf('/es/blog/', 1), '/es/blog/');
  assert.equal(pagePathOf('/es/blog/', 3), '/es/blog/3/');
});

test('pageNumbers shows the ends and the current page with ellipses between', () => {
  assert.deepEqual(pageNumbers(1, 1), [1]);
  assert.deepEqual(pageNumbers(1, 2), [1, 2]);
  assert.deepEqual(pageNumbers(1, 5), [1, 2, null, 5]);
  assert.deepEqual(pageNumbers(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageNumbers(5, 12), [1, null, 4, 5, 6, null, 12]);
  assert.deepEqual(pageNumbers(12, 12), [1, null, 11, 12]);
  // A one-page gap shows the page, not an ellipsis
  assert.deepEqual(pageNumbers(4, 12), [1, 2, 3, 4, 5, null, 12]);
});

const dated = <T extends object>(iso: string | null, extra = {} as T) => ({
  date: iso ? new Date(iso) : null,
  ...extra,
});

test('archiveTree groups by UTC year and month, newest first', () => {
  const tree = archiveTree([
    dated('2025-10-31T23:30:00Z'),
    dated('2026-02-01T00:00:00Z'),
    dated('2025-10-01T00:00:00Z'),
    dated('2025-11-01T00:00:00Z'),
    dated(null),
    dated('2026-01-15T00:00:00Z'),
  ]);
  assert.deepEqual(tree, [
    {
      year: 2026,
      months: [
        { month: 2, count: 1 },
        { month: 1, count: 1 },
      ],
    },
    {
      year: 2025,
      months: [
        { month: 11, count: 1 },
        { month: 10, count: 2 },
      ],
    },
  ]);
  assert.deepEqual(archiveTree([]), []);
});

test('postsInMonth uses UTC boundaries', () => {
  const posts = [
    dated('2025-10-31T23:30:00Z', { id: 'a' }),
    dated('2025-11-01T00:00:00Z', { id: 'b' }),
    dated(null, { id: 'c' }),
  ];
  assert.deepEqual(
    postsInMonth(posts, 2025, 10).map((p) => p.id),
    ['a']
  );
  assert.deepEqual(
    postsInMonth(posts, 2025, 11).map((p) => p.id),
    ['b']
  );
  assert.deepEqual(postsInMonth(posts, 2025, 13), []);
});

const post = (uuid: string, author?: string, tags: string[] = []) => ({
  uuid,
  author: author ? { uuid: author } : undefined,
  tags: tags.map((tag) => ({ uuid: tag })),
});

test('postsByTag and postsByAuthor filter by uuid', () => {
  const posts = [
    post('1', 'ana', ['t1']),
    post('2', 'bo', ['t1', 't2']),
    post('3'),
  ];
  assert.deepEqual(
    postsByTag(posts, 't1').map((p) => p.uuid),
    ['1', '2']
  );
  assert.deepEqual(
    postsByAuthor(posts, 'bo').map((p) => p.uuid),
    ['2']
  );
  assert.deepEqual(postsByTag(posts, 'none'), []);
});

test('pickByUuid keeps the editor order and skips missing items', () => {
  const posts = [post('1'), post('2'), post('3')];
  assert.deepEqual(
    pickByUuid(['3', 'gone', '1', 42], posts).map((p) => p.uuid),
    ['3', '1']
  );
  assert.deepEqual(pickByUuid(undefined, posts), []);
});

test('blogFeed leaves out featured posts and keeps the order', () => {
  const posts = [post('1'), post('2'), post('3')];
  assert.deepEqual(
    blogFeed(posts, ['2']).map((p) => p.uuid),
    ['1', '3']
  );
  assert.equal(blogFeed(posts, undefined).length, 3);
});

test('blogStrings falls back per field and per language', () => {
  const strings = blogStrings({ title: 'Diario', by_label: '  ' }, 'es');
  assert.equal(strings.title, 'Diario');
  assert.equal(strings.by_label, 'Por');
  assert.equal(blogStrings(null, 'en').featured_label, 'Featured posts');
  assert.equal(blogStrings(null, 'fr').all_posts_label, 'All posts');
});

test('fillTemplate replaces known placeholders', () => {
  assert.equal(
    fillTemplate('Archivo: {month} {year} {x}', { month: 'mayo', year: 2025 }),
    'Archivo: mayo 2025 {x}'
  );
});

test('archivePath pads the month', () => {
  assert.equal(archivePath('es', 2025, 7), '/es/blog/archive/2025/07/');
  assert.equal(archivePath('en', 2026, 12), '/en/blog/archive/2026/12/');
});
