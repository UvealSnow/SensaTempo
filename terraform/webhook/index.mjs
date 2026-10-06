// Storyblok webhook -> GitHub repository_dispatch, so publishing content rebuilds production.
// Runs behind a public Lambda Function URL (payload v2.0); the HMAC signature is the only protection.
// No dependencies: Node 24's fetch + node:crypto. Tested by index.test.mjs (pnpm test).
/* eslint-disable no-console -- console is the Lambda log */
import { createHmac, timingSafeEqual } from 'node:crypto';

const REPOSITORY = 'UvealSnow/SensaTempo';
export const DISPATCH_URL = `https://api.github.com/repos/${REPOSITORY}/dispatches`;
export const EVENT_TYPE = 'storyblok-publish';

// Story events carry story_id; datasource events carry datasource_slug. Action names are reused
// across event types (an asset can be "deleted" too), so check both.
const STORY_ACTIONS = new Set(['published', 'unpublished', 'deleted', 'moved']);
const DATASOURCE_ACTIONS = new Set(['entries_updated', 'entries_deleted']);

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

// HMAC-SHA1 of the raw body with the webhook secret, hex (Storyblok's webhook-signature header)
const validSignature = (rawBody, signature, secret) => {
  if (!secret || typeof signature !== 'string') return false;
  const expected = Buffer.from(
    createHmac('sha1', secret).update(rawBody).digest('hex')
  );
  const received = Buffer.from(signature.trim().toLowerCase());
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
};

// Keep client_payload small and plain: it ends up in the workflow's version.json and summary
const text = (value) =>
  value === undefined || value === null
    ? ''
    : String(value)
        .replace(/[^\x20-\x7e]/g, '')
        .slice(0, 200);

const describe = (payload) => {
  const { action } = payload;
  if (STORY_ACTIONS.has(action) && payload.story_id !== undefined) {
    return {
      action,
      story_id: text(payload.story_id),
      full_slug: text(payload.full_slug),
    };
  }
  if (DATASOURCE_ACTIONS.has(action) && payload.datasource_slug !== undefined) {
    return { action, full_slug: `datasource/${text(payload.datasource_slug)}` };
  }
  return null;
};

export const handler = async (event) => {
  if (event.requestContext?.http?.method !== 'POST') {
    return reply(405, { error: 'method not allowed' });
  }

  const rawBody = Buffer.from(
    event.body ?? '',
    event.isBase64Encoded ? 'base64' : 'utf8'
  );
  if (
    !validSignature(
      rawBody,
      event.headers?.['webhook-signature'],
      process.env.STORYBLOK_WEBHOOK_SECRET
    )
  ) {
    return reply(401, { error: 'invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return reply(400, { error: 'invalid JSON' });
  }

  const clientPayload = describe(payload ?? {});
  if (!clientPayload) {
    console.log('ignored', text(payload?.action));
    return { statusCode: 204 };
  }

  let response;
  try {
    response = await fetch(DISPATCH_URL, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
        'content-type': 'application/json',
        'user-agent': 'sensatempo-storyblok-webhook',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE,
        client_payload: clientPayload,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error('dispatch failed', error.name);
    return reply(502, { error: 'GitHub unreachable' });
  }

  if (!response.ok) {
    console.error('dispatch rejected', response.status);
    return reply(502, { error: `GitHub answered ${response.status}` });
  }

  console.log('dispatched', clientPayload.action, clientPayload.full_slug);
  return reply(202, { dispatched: clientPayload });
};
