import { defineMiddleware } from 'astro:middleware';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Hash first so both buffers have equal length, as timingSafeEqual requires
const safeEqual = (a: string, b: string): boolean =>
  timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest()
  );

function parseBasicAuth(
  header: string | null
): { user: string; pass: string } | null {
  if (!header || !header.toLowerCase().startsWith('basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString(
      'utf8'
    );
    const i = decoded.indexOf(':');
    if (i === -1) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

// Storyblok editor token cutoff, as in Storyblok's own example
const EDITOR_TOKEN_MAX_AGE_SECONDS = 60 * 60;

/**
 * Basic auth can't be answered inside the Visual Editor's cross-origin iframe, so the editor is
 * let in by the `_storyblok_tk` params it appends to the preview URL instead:
 * token = sha1(space_id:preview_token:timestamp), timestamp in seconds.
 */
function isValidEditorRequest(url: URL, previewToken: string): boolean {
  const spaceId = url.searchParams.get('_storyblok_tk[space_id]');
  const timestamp = url.searchParams.get('_storyblok_tk[timestamp]');
  const token = url.searchParams.get('_storyblok_tk[token]');
  if (!spaceId || !timestamp || !token) return false;

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || age > EDITOR_TOKEN_MAX_AGE_SECONDS) return false;

  const expected = createHash('sha1')
    .update(`${spaceId}:${previewToken}:${timestamp}`)
    .digest('hex');
  return safeEqual(token, expected);
}

// Links clicked inside the editor iframe drop the `_storyblok_tk` params, so a valid token is
// swapped for a signed session cookie. The iframe is cross-site (app.storyblok.com), hence
// SameSite=None + Partitioned (CHIPS) so browsers that block third-party cookies still keep it.
const EDITOR_COOKIE = 'sb_editor';
const EDITOR_SESSION_SECONDS = 8 * 60 * 60;

// Signed with the preview token: server-only, and rotating it ends all editor sessions
const signSession = (expires: number, previewToken: string): string =>
  createHmac('sha256', previewToken)
    .update(`editor-session:${expires}`)
    .digest('hex');

function isValidEditorSession(
  value: string | undefined,
  previewToken: string
): boolean {
  const [expires, signature] = value?.split('.') ?? [];
  if (!expires || !signature) return false;
  if (!(Number(expires) > Math.floor(Date.now() / 1000))) return false;
  return safeEqual(signature, signSession(Number(expires), previewToken));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const expectedUser = process.env.PREVIEW_BASIC_AUTH_USER?.trim();
  const expectedPass = process.env.PREVIEW_BASIC_AUTH_PASSWORD?.trim();
  const previewToken = process.env.STORYBLOK_PREVIEW_TOKEN?.trim();

  if (!expectedUser || !expectedPass) {
    return next();
  }

  if (previewToken && isValidEditorRequest(context.url, previewToken)) {
    const expires = Math.floor(Date.now() / 1000) + EDITOR_SESSION_SECONDS;
    context.cookies.set(
      EDITOR_COOKIE,
      `${expires}.${signSession(expires, previewToken)}`,
      {
        path: '/',
        maxAge: EDITOR_SESSION_SECONDS,
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        partitioned: true,
      }
    );
    return next();
  }

  if (
    previewToken &&
    isValidEditorSession(
      context.cookies.get(EDITOR_COOKIE)?.value,
      previewToken
    )
  ) {
    return next();
  }

  const parsed = parseBasicAuth(context.request.headers.get('authorization'));
  if (
    parsed &&
    safeEqual(parsed.user, expectedUser) &&
    safeEqual(parsed.pass, expectedPass)
  ) {
    return next();
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Preview"',
      'Cache-Control': 'no-store',
    },
  });
});
