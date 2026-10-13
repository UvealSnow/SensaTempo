import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { hasHeadingOne, pageTitle } from './headings.ts';

const text = (heading: string, heading_level = 'h2') => ({
  component: 'text',
  heading,
  heading_level,
});

test('pageTitle prefers the title field, then the first text heading', () => {
  assert.equal(
    pageTitle({ title: ' Sobre mí ', body: [text('Hola')] }),
    'Sobre mí'
  );
  assert.equal(
    pageTitle({
      body: [{ component: 'picture' }, text(' '), text('Contacto', 'h1')],
    }),
    'Contacto'
  );
  assert.equal(pageTitle({ body: [] }), undefined);
  assert.equal(pageTitle(null), undefined);
});

test('hasHeadingOne counts the title and h1 text blocks', () => {
  assert.equal(hasHeadingOne({ title: 'Tienda' }), true);
  assert.equal(hasHeadingOne({ body: [text('Contacto', 'h1')] }), true);
  assert.equal(hasHeadingOne({ body: [text('Hola')] }), false);
  assert.equal(hasHeadingOne(undefined), false);
});
