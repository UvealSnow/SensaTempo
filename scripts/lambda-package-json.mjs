// Writes a package.json listing only the npm packages the built server bundle imports at runtime,
// pinned to the versions installed locally. Keeps the Lambda zip far below the 250 MB limit.
//
// Usage: node scripts/lambda-package-json.mjs <dist/server> <output package.json>
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { join } from 'node:path';

const [serverDir, outFile] = process.argv.slice(2);
const require = createRequire(join(process.cwd(), 'package.json'));
const builtins = new Set(builtinModules);

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? files(path)
      : path.endsWith('.mjs')
        ? [path]
        : [];
  });

const specifiers = new Set();
for (const file of files(serverDir)) {
  const code = readFileSync(file, 'utf8');
  for (const [, spec] of code.matchAll(
    /(?:from|import\s*\(?)\s*['"]([^'"./][^'"]*)['"]/g
  )) {
    specifiers.add(spec);
  }
}

const dependencies = {};
for (const spec of specifiers) {
  if (spec.startsWith('node:') || spec.includes('${')) continue;
  const parts = spec.split('/');
  const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  if (builtins.has(name)) continue;
  dependencies[name] = require(`${name}/package.json`).version;
}

writeFileSync(
  outFile,
  JSON.stringify({ type: 'module', dependencies }, null, 2)
);
// eslint-disable-next-line no-console -- CLI script output
console.log('Lambda runtime dependencies:', dependencies);
