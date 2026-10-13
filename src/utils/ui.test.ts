import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { uiStrings } from './ui.ts';

test('uiStrings has every key in each language and falls back to English', () => {
  assert.deepEqual(Object.keys(uiStrings('es')), Object.keys(uiStrings('en')));
  assert.equal(uiStrings('es').menu, 'Menú');
  assert.equal(uiStrings('fr').skip_link, 'Skip to content');
});
