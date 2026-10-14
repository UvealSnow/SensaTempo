import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fullTitle, jsonLd, ogLocale, seoDefaults, shareImage } from './seo.ts';

const asset = (name: string, extra = {}) => ({
  filename: `https://a.storyblok.com/f/1/3200x1978/abc/${name}.jpg`,
  alt: `Alt ${name}`,
  ...extra,
});

test('shareImage takes the first asset with a file and crops it to 1200×630 JPEG', () => {
  const image = shareImage(
    undefined,
    { filename: '' },
    asset('cover', { focus: '10x20:30x40' }),
    asset('default')
  );
  assert.equal(image?.width, 1200);
  assert.equal(image?.height, 630);
  assert.equal(image?.alt, 'Alt cover');
  assert.match(
    image!.url,
    /cover\.jpg\/m\/1200x630\/filters:focal\(10x20:30x40\):quality\(75\):format\(jpeg\)$/
  );
  assert.equal(shareImage(null, undefined), null);
});

test('seoDefaults reads the story and falls back per field', () => {
  const fallback = { siteName: 'SensaTempo', description: 'Fotos' };
  assert.deepEqual(seoDefaults(null, fallback), {
    ...fallback,
    image: undefined,
    xHandle: undefined,
  });
  const defaults = seoDefaults(
    {
      site_name: ' Mi blog ',
      description: '',
      image: asset('share'),
      x_handle: 'kevin',
    },
    fallback
  );
  assert.equal(defaults.siteName, 'Mi blog');
  assert.equal(defaults.description, 'Fotos');
  assert.equal(defaults.image?.alt, 'Alt share');
  assert.equal(defaults.xHandle, '@kevin');
  assert.equal(
    seoDefaults({ x_handle: '@kevin', image: { filename: '' } }, fallback)
      .image,
    undefined
  );
});

test('fullTitle, ogLocale and jsonLd', () => {
  assert.equal(fullTitle('Blog', 'SensaTempo'), 'Blog · SensaTempo');
  assert.equal(fullTitle(undefined, 'SensaTempo'), 'SensaTempo');
  assert.equal(fullTitle('SensaTempo', 'SensaTempo'), 'SensaTempo');
  assert.equal(ogLocale('es'), 'es_MX');
  assert.equal(ogLocale('fr'), 'fr');
  assert.equal(jsonLd({ name: '</script>' }), '{"name":"\\u003c/script>"}');
});
