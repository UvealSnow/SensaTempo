// Fails when a page in the static build links to a site path that has no file in it.
// In GitHub Actions each broken link is also reported as a warning annotation.
//
// Usage: node scripts/check-links.mjs [dist]
/* eslint-disable no-console -- CLI output */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const exists = (path) => {
  const target = join(dist, decodeURI(path));
  return path.endsWith('/')
    ? existsSync(join(target, 'index.html'))
    : existsSync(target) || existsSync(join(target, 'index.html'));
};

const broken = new Map();
for (const file of files(dist).filter((path) => path.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const [, href] of html.matchAll(/\shref="(\/(?!\/)[^"#?]*)/g)) {
    if (exists(href)) continue;
    const pages = broken.get(href) ?? new Set();
    pages.add(relative(dist, file));
    broken.set(href, pages);
  }
}

for (const [href, pages] of broken) {
  const where = [...pages].slice(0, 3).join(', ');
  const more = pages.size > 3 ? ` and ${pages.size - 3} more` : '';
  console.log(`${href} ← ${where}${more}`);
  if (process.env.GITHUB_ACTIONS) {
    console.log(
      `::warning title=Broken link::${href} (linked from ${where}${more})`
    );
  }
}
console.log(
  broken.size ? `${broken.size} broken link(s)` : 'No broken internal links'
);
process.exit(broken.size ? 1 : 0);
