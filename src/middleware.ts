import { defineMiddleware } from 'astro:middleware';
import { createHash, timingSafeEqual } from 'node:crypto';

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

export const onRequest = defineMiddleware(async (context, next) => {
  const expectedUser = process.env.PREVIEW_BASIC_AUTH_USER?.trim();
  const expectedPass = process.env.PREVIEW_BASIC_AUTH_PASSWORD?.trim();

  if (!expectedUser || !expectedPass) {
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
