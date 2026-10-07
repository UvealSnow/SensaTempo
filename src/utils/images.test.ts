import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  assetDimensions,
  imageUrl,
  responsiveImage,
  sizesFor,
} from './images.ts';

const golden = 'https://a.storyblok.com/f/1/3200x1978/abc/vitral.jpg';
const small = '//a.storyblok.com/f/1/600x600/abc/small.jpg';

test('assetDimensions reads the size from the asset URL', () => {
  assert.deepEqual(assetDimensions(golden), { width: 3200, height: 1978 });
  assert.equal(assetDimensions('https://example.com/x.jpg'), null);
});

test('imageUrl resizes to WebP and keeps the focal point', () => {
  assert.equal(
    imageUrl(golden, 800, 494),
    `${golden}/m/800x494/filters:quality(75):format(webp)`
  );
  assert.equal(
    imageUrl(small, 32, 32, { quality: 30, focus: '10x20:30x40' }),
    'https://a.storyblok.com/f/1/600x600/abc/small.jpg/m/32x32/filters:focal(10x20:30x40):quality(30):format(webp)'
  );
  assert.match(
    imageUrl(golden, 1200, 630, { format: 'jpeg' }),
    /format\(jpeg\)$/
  );
});

test('sizesFor follows the column spans', () => {
  assert.equal(
    sizesFor({ lg: '6/12' }),
    '(min-width: 1536px) 768px, (min-width: 1024px) 50vw, (min-width: 768px) 50vw, 100vw'
  );
  assert.equal(
    sizesFor({ md: '12/12', lg: '4/12' }),
    '(min-width: 1536px) 512px, (min-width: 1024px) 33vw, (min-width: 768px) 100vw, 100vw'
  );
  assert.equal(sizesFor(), sizesFor({ lg: '12/12' }));
});

test('responsiveImage never sends the original or upscales', () => {
  const image = responsiveImage({ filename: golden, alt: 'Window' });
  assert.ok(image);
  assert.equal(image.srcset.split(', ').length, 5);
  assert.ok(!image.srcset.includes(`${golden} `), 'original URL in srcset');
  assert.equal(image.width, 2400);
  assert.equal(image.height, Math.round(2400 / 1.618));
  assert.match(image.placeholder, /\/m\/32x20\/filters:quality\(30\)/);
  assert.equal(image.alt, 'Window');

  const tiny = responsiveImage({ filename: small }, { ratio: 'square' });
  assert.ok(tiny);
  assert.equal(tiny.srcset, `${imageUrl(small, 480, 480)} 480w`);
  assert.equal(tiny.width, 480);
  assert.equal(tiny.alt, '');
});

test('responsiveImage keeps the original ratio when asked', () => {
  const portrait = 'https://a.storyblok.com/f/1/2000x3000/abc/calle.jpg';
  const image = responsiveImage({ filename: portrait }, { ratio: 'original' });
  assert.equal(image?.width, 1600);
  assert.equal(image?.height, 2400);
});

test('responsiveImage is null for empty or foreign assets', () => {
  assert.equal(responsiveImage(undefined), null);
  assert.equal(responsiveImage({ filename: '' }), null);
  assert.equal(
    responsiveImage({ filename: 'https://example.com/x.jpg' }),
    null
  );
});
