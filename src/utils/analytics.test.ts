import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { cloudflareAnalyticsToken } from './analytics.ts';

const token = 'abc123';

test('production builds with a token get it (trimmed)', () => {
  assert.equal(
    cloudflareAnalyticsToken({
      DEV: false,
      PUBLIC_BUILD_TYPE: 'static',
      PUBLIC_CF_ANALYTICS_TOKEN: ` ${token} `,
    }),
    token
  );
  assert.equal(
    cloudflareAnalyticsToken({ DEV: false, PUBLIC_CF_ANALYTICS_TOKEN: token }),
    token
  );
});

test('preview, dev and a missing token turn analytics off', () => {
  assert.equal(
    cloudflareAnalyticsToken({
      DEV: false,
      PUBLIC_BUILD_TYPE: 'server',
      PUBLIC_CF_ANALYTICS_TOKEN: token,
    }),
    undefined
  );
  assert.equal(
    cloudflareAnalyticsToken({ DEV: true, PUBLIC_CF_ANALYTICS_TOKEN: token }),
    undefined
  );
  for (const value of [undefined, '', '   ']) {
    assert.equal(
      cloudflareAnalyticsToken({
        DEV: false,
        PUBLIC_CF_ANALYTICS_TOKEN: value,
      }),
      undefined
    );
  }
});
