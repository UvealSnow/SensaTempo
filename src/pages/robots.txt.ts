import type { APIRoute } from 'astro';
import { allowIndexing, robotsTxt } from '~/utils/site';

export const GET: APIRoute = ({ site }) =>
  new Response(
    robotsTxt(
      site?.origin ?? '',
      allowIndexing(import.meta.env, import.meta.env.DEV)
    ),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } }
  );
