import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { allowIndexing, robotsTxt, siteUrl } from './site.ts';

test('siteUrl normalizes to an origin and defaults to sensatempo.com', () => {
  assert.equal(
    siteUrl({ PUBLIC_SITE_URL: 'https://d1.cloudfront.net/' }),
    'https://d1.cloudfront.net'
  );
  assert.equal(
    siteUrl({ PUBLIC_SITE_URL: ' https://blog.example.com/x ' }),
    'https://blog.example.com'
  );
  assert.equal(siteUrl({}), 'https://sensatempo.com');
  assert.throws(() => siteUrl({ PUBLIC_SITE_URL: 'nope' }), /absolute URL/);
});

test('allowIndexing is opt-in and off for the preview and dev', () => {
  assert.equal(
    allowIndexing({
      PUBLIC_ALLOW_INDEXING: 'true',
      PUBLIC_BUILD_TYPE: 'static',
    }),
    true
  );
  assert.equal(allowIndexing({ PUBLIC_ALLOW_INDEXING: 'false' }), false);
  assert.equal(allowIndexing({}), false);
  assert.equal(
    allowIndexing({
      PUBLIC_ALLOW_INDEXING: 'true',
      PUBLIC_BUILD_TYPE: 'server',
    }),
    false
  );
  assert.equal(allowIndexing({ PUBLIC_ALLOW_INDEXING: 'true' }, true), false);
});

test('robotsTxt allows crawling and lists the sitemap only when indexing', () => {
  assert.equal(robotsTxt('https://a.com', false), 'User-agent: *\nAllow: /\n');
  assert.equal(
    robotsTxt('https://a.com', true),
    'User-agent: *\nAllow: /\n\nSitemap: https://a.com/sitemap-index.xml\n'
  );
});
