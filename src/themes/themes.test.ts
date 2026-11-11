import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// WCAG 2.2 AA for every theme's role tokens: 4.5:1 for text, 3:1 for the focus ring
const TEXT_PAIRS = [
  ['fg', 'page'],
  ['fg', 'surface'],
  ['fg', 'subtle'],
  ['fg-strong', 'page'],
  ['muted', 'page'],
  ['muted', 'surface'],
  ['muted', 'subtle'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-hover'],
  ['danger', 'page'],
  ['danger', 'surface'],
] as const;
const UI_PAIRS = [
  ['focus', 'page'],
  ['focus', 'surface'],
] as const;

const themesDir = new URL('./', import.meta.url);
const themes = readdirSync(themesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

function colors(css: string): Map<string, string> {
  const found = css.matchAll(/--color-([a-z-]+):\s*([^;]+);/g);
  return new Map([...found].map(([, name, value]) => [name, value.trim()]));
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((pair) => parseInt(pair, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('there is at least one theme', () => assert.ok(themes.length > 0));

for (const theme of themes) {
  test(`${theme}: role colors are 6-digit hex and pass AA`, () => {
    const css = readFileSync(new URL(`${theme}/theme.css`, themesDir), 'utf8');
    const tokens = colors(css);
    const value = (name: string) => {
      const hex = tokens.get(name);
      assert.match(hex ?? '', /^#[0-9a-f]{6}$/i, `${theme}: --color-${name}`);
      return hex!;
    };
    for (const [pairs, min] of [
      [TEXT_PAIRS, 4.5],
      [UI_PAIRS, 3],
    ] as const) {
      for (const [fg, bg] of pairs) {
        const ratio = contrast(value(fg), value(bg));
        assert.ok(
          ratio >= min,
          `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`
        );
      }
    }
  });
}
