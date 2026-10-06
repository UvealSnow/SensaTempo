// Runs the Storyblok webhook relay against Function URL (payload v2.0) events with fetch mocked.
import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { DISPATCH_URL, EVENT_TYPE, handler } from './index.mjs';

const SECRET = 'test-webhook-secret';
const TOKEN = 'test-dispatch-token';

const sign = (body, secret = SECRET) =>
  createHmac('sha1', secret).update(body).digest('hex');

const functionUrlEvent = ({
  body,
  signature = sign(body),
  method = 'POST',
  base64 = false,
  key,
}) => ({
  version: '2.0',
  rawPath: '/',
  headers: {
    'content-type': 'application/json',
    ...(signature === null ? {} : { 'webhook-signature': signature }),
  },
  ...(key === undefined ? {} : { queryStringParameters: { key } }),
  requestContext: { http: { method, path: '/' } },
  body: base64 ? Buffer.from(body).toString('base64') : body,
  isBase64Encoded: base64,
});

const published = JSON.stringify({
  text: 'The user published the Story Home (es/home)',
  action: 'published',
  space_id: 184738,
  story_id: 166888799188279,
  full_slug: 'es/home',
});

let fetchMock;

beforeEach(() => {
  process.env.STORYBLOK_WEBHOOK_SECRET = SECRET;
  process.env.GITHUB_DISPATCH_TOKEN = TOKEN;
  fetchMock = mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 204,
  }));
  mock.method(console, 'log', () => {});
  mock.method(console, 'error', () => {});
});

afterEach(() => mock.restoreAll());

test('a signed publish dispatches to GitHub and returns 202', async () => {
  const response = await handler(functionUrlEvent({ body: published }));

  assert.equal(response.statusCode, 202);
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, init] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, DISPATCH_URL);
  assert.equal(
    url,
    'https://api.github.com/repos/UvealSnow/SensaTempo/dispatches'
  );
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.authorization, `Bearer ${TOKEN}`);
  assert.equal(init.headers.accept, 'application/vnd.github+json');
  assert.equal(init.headers['x-github-api-version'], '2022-11-28');
  assert.ok(init.headers['user-agent']);
  assert.deepEqual(JSON.parse(init.body), {
    event_type: EVENT_TYPE,
    client_payload: {
      action: 'published',
      story_id: '166888799188279',
      full_slug: 'es/home',
    },
  });
  assert.equal(EVENT_TYPE, 'storyblok-publish');
});

test('a base64-encoded body is verified against the decoded bytes', async () => {
  const response = await handler(
    functionUrlEvent({ body: published, base64: true })
  );
  assert.equal(response.statusCode, 202);
});

test('the other story actions and datasource entry changes dispatch too', async () => {
  for (const action of ['unpublished', 'deleted', 'moved']) {
    const body = JSON.stringify({ action, story_id: 1, full_slug: 'en/about' });
    assert.equal((await handler(functionUrlEvent({ body }))).statusCode, 202);
  }
  for (const action of ['entries_updated', 'entries_deleted']) {
    const body = JSON.stringify({ action, datasource_slug: 'colors' });
    assert.equal((await handler(functionUrlEvent({ body }))).statusCode, 202);
  }
  const lastBody = JSON.parse(fetchMock.mock.calls.at(-1).arguments[1].body);
  assert.deepEqual(lastBody.client_payload, {
    action: 'entries_deleted',
    full_slug: 'datasource/colors',
  });
});

test('a missing or wrong signature is rejected with 401', async () => {
  const cases = [
    functionUrlEvent({ body: published, signature: null }),
    functionUrlEvent({ body: published, signature: '' }),
    functionUrlEvent({ body: published, signature: 'abc' }),
    functionUrlEvent({ body: published, signature: sign(published, 'wrong') }),
    // Signed body, tampered payload
    {
      ...functionUrlEvent({ body: published }),
      body: published.replace('es/home', 'es/evil'),
    },
  ];
  for (const event of cases) {
    assert.equal((await handler(event)).statusCode, 401);
  }

  delete process.env.STORYBLOK_WEBHOOK_SECRET;
  assert.equal(
    (await handler(functionUrlEvent({ body: published }))).statusCode,
    401
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('an unsigned request with the secret as ?key= dispatches (free plan)', async () => {
  const response = await handler(
    functionUrlEvent({ body: published, signature: null, key: SECRET })
  );
  assert.equal(response.statusCode, 202);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('a missing or wrong ?key= is rejected with 401', async () => {
  for (const key of ['', 'wrong', `${SECRET}x`]) {
    const event = functionUrlEvent({ body: published, signature: null, key });
    assert.equal((await handler(event)).statusCode, 401);
  }

  delete process.env.STORYBLOK_WEBHOOK_SECRET;
  const event = functionUrlEvent({ body: published, signature: null, key: '' });
  assert.equal((await handler(event)).statusCode, 401);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('non-POST requests are rejected', async () => {
  for (const method of ['GET', 'PUT', 'OPTIONS']) {
    const response = await handler(
      functionUrlEvent({ body: published, method })
    );
    assert.equal(response.statusCode, 405);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('other events are ignored with 204', async () => {
  const bodies = [
    { action: 'created', asset_id: 1 },
    { action: 'deleted', asset_id: 1 }, // asset, not story
    { action: 'stage.changed', story_id: 1, workflow_name: 'Default' },
    { action: 'merged', release_id: 1 },
  ];
  for (const payload of bodies) {
    const body = JSON.stringify(payload);
    assert.equal((await handler(functionUrlEvent({ body }))).statusCode, 204);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('a signed but malformed body is a 400', async () => {
  const response = await handler(functionUrlEvent({ body: 'not json' }));
  assert.equal(response.statusCode, 400);
});

test('a GitHub error or network failure is a 502', async () => {
  fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 401 }));
  assert.equal(
    (await handler(functionUrlEvent({ body: published }))).statusCode,
    502
  );

  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError('fetch failed');
  });
  assert.equal(
    (await handler(functionUrlEvent({ body: published }))).statusCode,
    502
  );
});
