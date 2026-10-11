import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { acceptLanguages, pickLanguage } from './language.ts';
import { LANGUAGES } from './fixtures.ts';

test('pickLanguage takes the language from the URL prefix', () => {
  assert.equal(pickLanguage('/es/nope/', ['en-US'], LANGUAGES), 'es');
  assert.equal(pickLanguage('/en/blog/nope', ['es-MX'], LANGUAGES), 'en');
  assert.equal(pickLanguage('/en', [], LANGUAGES), 'en');
});

test('pickLanguage falls back to the most preferred browser language', () => {
  assert.equal(pickLanguage('/nope', ['es-MX', 'en'], LANGUAGES), 'es');
  assert.equal(pickLanguage('/nope', ['ES'], LANGUAGES), 'es');
  assert.equal(pickLanguage('/nope', ['en-US', 'es'], LANGUAGES), 'en');
  assert.equal(pickLanguage('/fr/nope', ['fr'], LANGUAGES), 'en');
  assert.equal(pickLanguage('/', [], LANGUAGES), 'en');
  // Not a language prefix, just a slug starting with "es"
  assert.equal(pickLanguage('/estudio', ['en'], LANGUAGES), 'en');
});

test('pickLanguage is self-contained, so it can be inlined', () => {
  const inlined = new Function(`return (${pickLanguage.toString()});`)();
  assert.equal(inlined('/x', ['es-AR'], LANGUAGES), 'es');
});

test('acceptLanguages orders the header by q, keeping ties in order', () => {
  assert.deepEqual(acceptLanguages('es-MX,es;q=0.9,en;q=0.8'), [
    'es-MX',
    'es',
    'en',
  ]);
  assert.deepEqual(acceptLanguages('en;q=0.5, es-AR;q=0.8'), ['es-AR', 'en']);
  assert.deepEqual(acceptLanguages('fr, de'), ['fr', 'de']);
  assert.deepEqual(acceptLanguages('es;q=0, en'), ['en']);
  assert.deepEqual(acceptLanguages(null), []);
  assert.deepEqual(acceptLanguages(''), []);
});
