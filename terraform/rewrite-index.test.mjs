// Runs the sensatempo-rewrite-index CloudFront Function from main.tf's heredoc in Node.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const mainTf = readFileSync(new URL('./main.tf', import.meta.url), 'utf8');
const heredoc = mainTf.match(
  /resource "aws_cloudfront_function" "rewrite_index"[\s\S]*?<<-EOT\n([\s\S]*?)\n\s*EOT/
)?.[1];
assert.ok(heredoc, 'rewrite_index heredoc not found in main.tf');
// Terraform would interpolate these; the function must not use them
assert.ok(!/[$%]\{/.test(heredoc), 'heredoc contains Terraform interpolation');

const handler = new Function(`${heredoc}\nreturn handler;`)();

const viewerRequest = (uri, acceptLanguage) =>
  handler({
    request: {
      uri,
      headers: acceptLanguage
        ? { 'accept-language': { value: acceptLanguage } }
        : {},
    },
  });

const redirectFor = (acceptLanguage) => {
  const response = viewerRequest('/', acceptLanguage);
  assert.equal(response.statusCode, 302);
  return response.headers.location.value;
};

test('/ redirects Spanish browsers to /es/', () => {
  assert.equal(redirectFor('es'), '/es/');
  assert.equal(redirectFor('es-MX,es;q=0.9,en;q=0.8'), '/es/');
  assert.equal(redirectFor('ES-mx'), '/es/');
  assert.equal(redirectFor('en;q=0.5, es-AR;q=0.8'), '/es/');
});

test('/ redirects everything else to /en/', () => {
  assert.equal(redirectFor(undefined), '/en/');
  assert.equal(redirectFor(''), '/en/');
  assert.equal(redirectFor('en-US,en;q=0.9'), '/en/');
  assert.equal(redirectFor('fr'), '/en/');
  assert.equal(redirectFor('fr-FR,es;q=0.9'), '/en/');
  assert.equal(redirectFor('*'), '/en/');
  assert.equal(redirectFor('estonian'), '/en/');
  assert.equal(redirectFor('es;q=0, en;q=0.1'), '/en/');
  // Equal q keeps the header's order
  assert.equal(redirectFor('en, es'), '/en/');
});

test('other paths are rewritten to index.html, never redirected', () => {
  assert.equal(viewerRequest('/es/', 'en').uri, '/es/index.html');
  assert.equal(viewerRequest('/en/about', 'es').uri, '/en/about/index.html');
  assert.equal(viewerRequest('/_astro/app.css').uri, '/_astro/app.css');
});
