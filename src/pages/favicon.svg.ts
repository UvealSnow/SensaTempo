import type { APIRoute } from 'astro';
import favicon from '~theme/favicon.svg?raw';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(favicon, { headers: { 'content-type': 'image/svg+xml' } });
