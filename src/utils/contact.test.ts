import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  contactStrings,
  TURNSTILE_TEST_SITE_KEY,
  turnstileSiteKey,
} from './contact.ts';

test('turnstileSiteKey falls back to the always-pass test key', () => {
  assert.equal(
    turnstileSiteKey({ PUBLIC_TURNSTILE_SITE_KEY: ' 0x4AAA ' }),
    '0x4AAA'
  );
  assert.equal(
    turnstileSiteKey({ PUBLIC_TURNSTILE_SITE_KEY: '' }),
    TURNSTILE_TEST_SITE_KEY
  );
  assert.equal(turnstileSiteKey({}), TURNSTILE_TEST_SITE_KEY);
});

test('contactStrings falls back per field and per language', () => {
  const strings = contactStrings(
    { submit_label: 'Mandar', name_label: ' ' },
    'es'
  );
  assert.equal(strings.submit_label, 'Mandar');
  assert.equal(strings.name_label, 'Nombre');
  assert.equal(contactStrings(null, 'fr').email_label, 'Email');
});
