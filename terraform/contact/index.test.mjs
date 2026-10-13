// Runs the contact handler against Function URL (payload v2.0) events with Turnstile and SES mocked.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { composeEmail, createHandler, LIMITS, validate } from './index.mjs';

const ORIGIN = 'https://d1fr6xerqueq2v.cloudfront.net';
const env = {
  ALLOWED_ORIGINS: `${ORIGIN},https://sensatempo.com`,
  TURNSTILE_SECRET: 'secret',
  CONTACT_RECIPIENT: 'hola@example.com',
};
const valid = {
  name: 'Ana',
  email: 'ana@example.com',
  message: 'Hola',
  token: 'tok',
  lang: 'es',
  page: '/es/contact/',
};

const event = (body, { origin = ORIGIN, method = 'POST', raw } = {}) => ({
  version: '2.0',
  headers: origin ? { origin } : {},
  requestContext: { http: { method } },
  body: raw ?? JSON.stringify(body),
  isBase64Encoded: false,
});

function setup({
  check = { success: true, hostname: 'd1fr6xerqueq2v.cloudfront.net' },
  sendError,
} = {}) {
  const calls = { verify: [], send: [] };
  const handler = createHandler({
    env,
    verify: async (...args) => {
      calls.verify.push(args);
      if (check instanceof Error) throw check;
      return check;
    },
    send: async (mail) => {
      calls.send.push(mail);
      if (sendError) throw sendError;
    },
  });
  return { handler, calls };
}

const parse = (response) => ({ ...response, json: JSON.parse(response.body) });

test('sends a valid message to the recipient with the visitor as Reply-To', async () => {
  const { handler, calls } = setup();
  const response = parse(await handler(event(valid)));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json, { ok: true });
  assert.deepEqual(calls.verify, [['tok', 'secret']]);
  assert.equal(calls.send.length, 1);
  assert.equal(calls.send[0].to, 'hola@example.com');
  assert.equal(calls.send[0].from, 'hola@example.com');
  assert.equal(calls.send[0].replyTo, 'ana@example.com');
  assert.equal(calls.send[0].subject, 'Contacto: Ana');
});

test('rejects other methods and origins before doing any work', async () => {
  const { handler, calls } = setup();
  assert.equal(
    (await handler(event(valid, { method: 'GET' }))).statusCode,
    405
  );
  assert.equal(
    (await handler(event(valid, { origin: 'https://evil.example' })))
      .statusCode,
    400
  );
  assert.equal((await handler(event(valid, { origin: null }))).statusCode, 400);
  assert.equal(calls.verify.length + calls.send.length, 0);
});

test('a filled honeypot pretends to succeed without sending', async () => {
  const { handler, calls } = setup();
  const response = parse(
    await handler(event({ ...valid, website: 'spam.example' }))
  );
  assert.equal(response.statusCode, 200);
  assert.equal(calls.send.length, 0);
  assert.equal(calls.verify.length, 0);
});

test('invalid fields come back by name', async () => {
  const { handler, calls } = setup();
  const response = parse(
    await handler(
      event({
        ...valid,
        name: ' ',
        email: 'nope',
        message: 'x'.repeat(LIMITS.message + 1),
      })
    )
  );
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json, {
    error: 'invalid',
    fields: ['name', 'message', 'email'],
  });
  assert.equal(calls.send.length, 0);

  assert.equal(
    (await handler(event(null, { raw: '{not json' }))).statusCode,
    400
  );
});

test('a failed or foreign captcha is rejected', async () => {
  for (const check of [
    { success: false, 'error-codes': ['invalid-input-response'] },
    { success: true, hostname: 'other.example' },
  ]) {
    const { handler, calls } = setup({ check });
    const response = parse(await handler(event(valid)));
    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.json, { error: 'captcha' });
    assert.equal(calls.send.length, 0);
  }

  const { handler } = setup({ check: new Error('timeout') });
  assert.equal((await handler(event(valid))).statusCode, 502);
});

test('an SES failure is reported as 502', async () => {
  const { handler } = setup({
    sendError: Object.assign(new Error('x'), { name: 'MessageRejected' }),
  });
  const response = parse(await handler(event(valid)));
  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.json, { error: 'send' });
});

test('validate trims fields; composeEmail keeps the subject on one line', () => {
  assert.deepEqual(
    validate({ name: ' Ana ', email: ' a@b.co ', message: ' hi ' }),
    {
      fields: { name: 'Ana', email: 'a@b.co', message: 'hi' },
      invalid: [],
    }
  );
  assert.deepEqual(validate({ email: 'a b@c.d' }).invalid, [
    'name',
    'message',
    'email',
  ]);

  const mail = composeEmail(
    { name: 'Ana\r\nBcc: x@y.z', email: 'a@b.co', message: 'Hola' },
    { lang: 'es', page: '/es/contact/' }
  );
  assert.equal(mail.subject, 'Contacto: Ana Bcc: x@y.z');
  assert.equal(
    mail.text,
    'Ana\r\nBcc: x@y.z <a@b.co>\nPage: /es/contact/\nLanguage: es\n\nHola'
  );
});
