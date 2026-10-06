import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { linkHref, linkSlug, pagePath, resolveLinks } from './navigation.ts';

const languages = ['es', 'en'];

test('pagePath maps home to the language root', () => {
  assert.equal(pagePath('es', 'home'), '/es/');
  assert.equal(pagePath('en', 'about'), '/en/about/');
});

test('story links get the current language prefix', () => {
  const home = { linktype: 'story', cached_url: 'home' } as const;
  assert.equal(linkHref(home, 'es', languages), '/es/');
  assert.equal(linkHref(home, 'en', languages), '/en/');

  // Resolved links in a translation carry the language in full_slug
  const about = {
    linktype: 'story',
    cached_url: 'about',
    story: { full_slug: 'en/about' },
  } as const;
  assert.equal(linkHref(about, 'en', languages), '/en/about/');
  assert.equal(linkSlug(about, languages), 'about');

  const nested = {
    linktype: 'story',
    cached_url: 'blog/first-post/',
    anchor: 'top',
  } as const;
  assert.equal(linkHref(nested, 'es', languages), '/es/blog/first-post/#top');
});

test('external URLs are kept as is', () => {
  const url = 'https://instagram.com/sensatempo';
  assert.equal(
    linkHref({ linktype: 'url', url, cached_url: url }, 'es', languages),
    url
  );
  assert.equal(
    linkHref(
      { linktype: 'email', email: 'hola@sensatempo.com' },
      'en',
      languages
    ),
    'mailto:hola@sensatempo.com'
  );
});

test('empty links have no href', () => {
  assert.equal(linkHref(undefined, 'es', languages), null);
  assert.equal(
    linkHref({ linktype: 'story', cached_url: '' }, 'es', languages),
    null
  );
  assert.equal(
    linkHref({ linktype: 'url', url: '', cached_url: '' }, 'es', languages),
    null
  );
});

test('resolveLinks drops empty blocks and marks the current page', () => {
  const links = resolveLinks(
    [
      { label: 'Inicio', link: { linktype: 'story', cached_url: 'home' } },
      { label: 'Sobre mí', link: { linktype: 'story', cached_url: 'about' } },
      { label: 'Sin destino', link: { linktype: 'story', cached_url: '' } },
      { link: { linktype: 'url', url: 'https://example.com' } },
    ],
    'en',
    'about',
    languages
  );
  assert.deepEqual(
    links.map(({ label, href, isActive }) => [label, href, isActive]),
    [
      ['Inicio', '/en/', false],
      ['Sobre mí', '/en/about/', true],
    ]
  );
  assert.deepEqual(resolveLinks(undefined, 'es', 'home', languages), []);
});
