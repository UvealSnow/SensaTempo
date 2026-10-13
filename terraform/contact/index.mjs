// Contact form → email. Runs behind a public Lambda Function URL (payload v2.0), reached through
// CloudFront at /api/contact on the site's own domain. Checks the origin, a honeypot, the fields and
// a Cloudflare Turnstile token, then sends the message with SES (Reply-To = the visitor).
// No bundled dependencies: Node 24's fetch and the runtime's AWS SDK. Tested by index.test.mjs.
// Never answers 403 or 404: prod CloudFront replaces those with the 404 page.
/* eslint-disable no-console -- console is the Lambda log */

export const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/** Trimmed fields and the names of the invalid ones. */
export function validate(body) {
  const fields = {
    name: clean(body?.name),
    email: clean(body?.email),
    message: clean(body?.message),
  };
  const invalid = Object.entries(fields)
    .filter(([key, value]) => !value || value.length > LIMITS[key])
    .map(([key]) => key);
  if (
    fields.email &&
    !invalid.includes('email') &&
    !EMAIL_RE.test(fields.email)
  ) {
    invalid.push('email');
  }
  return { fields, invalid };
}

/** Plain-text email; the subject can't carry line breaks into the headers. */
export function composeEmail({ name, email, message }, { lang, page }) {
  const subject = `Contacto: ${name.replace(/[\r\n]+/g, ' ')}`.slice(0, 150);
  const lines = [`${name} <${email}>`];
  if (page) lines.push(`Page: ${page}`);
  if (lang) lines.push(`Language: ${lang}`);
  return { subject, text: [...lines, '', message].join('\n') };
}

async function verifyTurnstile(token, secret) {
  const response = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(5000),
  });
  return response.json();
}

let sesClient;
async function sendWithSes({ from, to, replyTo, subject, text }) {
  const { SESv2Client, SendEmailCommand } =
    await import('@aws-sdk/client-sesv2');
  sesClient ??= new SESv2Client({});
  await sesClient.send(
    new SendEmailCommand({
      FromEmailAddress: `SensaTempo <${from}>`,
      Destination: { ToAddresses: [to] },
      ReplyToAddresses: [replyTo],
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' } },
        },
      },
    })
  );
}

export function createHandler({
  verify = verifyTurnstile,
  send = sendWithSes,
  env = process.env,
} = {}) {
  return async (event) => {
    if (event.requestContext?.http?.method !== 'POST') {
      return reply(405, { error: 'method' });
    }

    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
    const origin = event.headers?.origin;
    if (!origin || !allowed.includes(origin)) {
      console.log('rejected origin');
      return reply(400, { error: 'origin' });
    }

    let body;
    try {
      body = JSON.parse(
        Buffer.from(
          event.body ?? '',
          event.isBase64Encoded ? 'base64' : 'utf8'
        ).toString('utf8')
      );
    } catch {
      return reply(400, { error: 'invalid', fields: [] });
    }

    // Bots fill every field; people never see this one. Pretend it worked
    if (clean(body?.website)) {
      console.log('honeypot');
      return reply(200, { ok: true });
    }

    const { fields, invalid } = validate(body);
    if (invalid.length)
      return reply(400, { error: 'invalid', fields: invalid });

    let check;
    try {
      check = await verify(clean(body.token), env.TURNSTILE_SECRET);
    } catch (error) {
      console.error('turnstile unreachable', error.name);
      return reply(502, { error: 'captcha' });
    }
    if (!check?.success || check.hostname !== new URL(origin).hostname) {
      // Counted by the "captcha" CloudWatch metric filter (terraform/main.tf)
      console.log('captcha failed', (check?.['error-codes'] ?? []).join(','));
      return reply(422, { error: 'captcha' });
    }

    const { subject, text } = composeEmail(fields, {
      lang: clean(body.lang).slice(0, 5),
      page: clean(body.page).slice(0, 300),
    });
    try {
      await send({
        from: env.CONTACT_RECIPIENT,
        to: env.CONTACT_RECIPIENT,
        replyTo: fields.email,
        subject,
        text,
      });
    } catch (error) {
      // Counted by the "send failed" CloudWatch metric filter (terraform/main.tf)
      console.error('send failed', error.name);
      return reply(502, { error: 'send' });
    }

    console.log('sent');
    return reply(200, { ok: true });
  };
}

export const handler = createHandler();
