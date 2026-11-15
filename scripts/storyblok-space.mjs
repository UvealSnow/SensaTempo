#!/usr/bin/env node
// Keeps Storyblok spaces in sync with the repo, so every site built from this codebase has the
// same blocks, folders and starter stories.
//
//   node scripts/storyblok-space.mjs export          components of STORYBLOK_SPACE_ID → storyblok/components.json
//   node scripts/storyblok-space.mjs push            what would change in STORYBLOK_SPACE_ID (dry run)
//   node scripts/storyblok-space.mjs push --apply    create/update languages, groups, components,
//                                                   folders and missing starter stories (never
//                                                   edits or publishes existing stories)
//
// Env: STORYBLOK_MANAGEMENT_TOKEN, STORYBLOK_SPACE_ID, STORYBLOK_MAPI_URL (default: EU region).
/* eslint-disable no-console -- a CLI that reports what it changes */
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { componentsEqual, normalizeComponent } from './storyblok-space-lib.mjs';

const COMPONENTS_FILE = new URL(
  '../storyblok/components.json',
  import.meta.url
);
const STRUCTURE_FILE = new URL('../storyblok/structure.json', import.meta.url);

const [command, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
const { STORYBLOK_MANAGEMENT_TOKEN: token, STORYBLOK_SPACE_ID: spaceId } =
  process.env;
const mapiUrl = process.env.STORYBLOK_MAPI_URL || 'https://mapi.storyblok.com';

if (!['export', 'push'].includes(command) || !token || !spaceId) {
  console.error(
    'Usage: STORYBLOK_MANAGEMENT_TOKEN=… STORYBLOK_SPACE_ID=… node scripts/storyblok-space.mjs export|push [--apply]'
  );
  process.exit(1);
}

async function mapi(method, path, body) {
  const url = `${mapiUrl}/v1/spaces/${spaceId}${path}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(url, {
      method,
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      continue;
    }
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `${method} ${path}: ${response.status} ${text.slice(0, 300)}`
      );
    }
    return text ? JSON.parse(text) : {};
  }
  throw new Error(`${method} ${path}: rate limited`);
}

/** Runs a write only with --apply; always logs it. */
async function change(description, write) {
  console.log(`${apply ? '✓' : '·'} ${description}`);
  if (apply) return write();
}

async function groupsByUuid() {
  const { component_groups } = await mapi('GET', '/component_groups');
  return new Map(component_groups.map((group) => [group.uuid, group.name]));
}

async function exportComponents() {
  const [{ components }, groups] = await Promise.all([
    mapi('GET', '/components'),
    groupsByUuid(),
  ]);
  const normalized = components
    .map((component) => normalizeComponent(component, groups))
    .sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(COMPONENTS_FILE, `${JSON.stringify(normalized, null, 2)}\n`);
  console.log(
    `Exported ${normalized.length} components to storyblok/components.json`
  );
}

async function storyBySlug(fullSlug) {
  const { stories } = await mapi(
    'GET',
    `/stories?with_slug=${encodeURIComponent(fullSlug)}`
  );
  return stories[0];
}

async function pushLanguages(languages) {
  const { space } = await mapi('GET', '');
  const missing = languages.filter(
    ({ code }) => !space.languages.some((language) => language.code === code)
  );
  if (!missing.length) return;
  await change(
    `languages: add ${missing.map(({ code }) => code).join(', ')}`,
    () =>
      mapi('PUT', '', {
        space: { languages: [...space.languages, ...missing] },
      })
  );
}

async function pushComponents(wanted) {
  const [{ components: current }, groups] = await Promise.all([
    mapi('GET', '/components'),
    groupsByUuid(),
  ]);
  const groupUuids = new Map([...groups].map(([uuid, name]) => [name, uuid]));

  for (const name of new Set(
    wanted.map(({ group }) => group).filter(Boolean)
  )) {
    if (groupUuids.has(name)) continue;
    await change(`group ${name}: create`, async () => {
      const { component_group } = await mapi('POST', '/component_groups', {
        component_group: { name },
      });
      groupUuids.set(name, component_group.uuid);
    });
  }

  for (const component of wanted) {
    const existing = current.find(({ name }) => name === component.name);
    if (
      existing &&
      componentsEqual(normalizeComponent(existing, groups), component)
    ) {
      continue;
    }
    const { group, ...fields } = component;
    const body = {
      component: {
        ...fields,
        component_group_uuid: groupUuids.get(group) ?? null,
      },
    };
    await change(
      `component ${component.name}: ${existing ? 'update' : 'create'}`,
      () =>
        existing
          ? mapi('PUT', `/components/${existing.id}`, body)
          : mapi('POST', '/components', body)
    );
  }
}

async function parentId(slug) {
  const parentSlug = slug.split('/').slice(0, -1).join('/');
  if (!parentSlug) return 0;
  const parent = await storyBySlug(parentSlug);
  // A dry run doesn't create the parent folder, so its children can't be resolved yet
  return parent?.id ?? null;
}

async function pushFolders(folders) {
  for (const folder of folders) {
    const existing = await storyBySlug(folder.slug);
    const content = {
      content_types: folder.content_types ?? [],
      lock_subfolders_content_types:
        folder.lock_subfolders_content_types ?? false,
    };
    if (existing) {
      const { story } = await mapi('GET', `/stories/${existing.id}`);
      const same =
        story.default_root === folder.default_root &&
        JSON.stringify(story.content?.content_types ?? []) ===
          JSON.stringify(content.content_types) &&
        Boolean(story.content?.lock_subfolders_content_types) ===
          content.lock_subfolders_content_types;
      if (same) continue;
      await change(`folder ${folder.slug}: update content types`, () =>
        mapi('PUT', `/stories/${existing.id}`, {
          story: { default_root: folder.default_root, content },
        })
      );
      continue;
    }
    const parent_id = await parentId(folder.slug);
    await change(`folder ${folder.slug}: create`, () =>
      mapi('POST', '/stories', {
        story: {
          name: folder.name,
          slug: folder.slug.split('/').pop(),
          is_folder: true,
          parent_id,
          default_root: folder.default_root,
          content,
        },
      })
    );
  }
}

const withUids = (blok) => ({
  _uid: randomUUID(),
  ...Object.fromEntries(
    Object.entries(blok).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(withUids) : value,
    ])
  ),
});

async function pushStories(stories) {
  for (const story of stories) {
    const fullSlug = story.startpage ? `${story.slug}/` : story.slug;
    if (await storyBySlug(fullSlug)) continue;
    const parent_id = story.startpage
      ? ((await storyBySlug(story.slug))?.id ?? null)
      : await parentId(story.slug);
    await change(`story ${fullSlug}: create (draft)`, () =>
      mapi('POST', '/stories', {
        story: {
          name: story.name,
          slug: story.slug.split('/').pop(),
          parent_id,
          is_startpage: Boolean(story.startpage),
          content: withUids({ component: story.component, ...story.content }),
        },
      })
    );
  }
}

if (command === 'export') {
  await exportComponents();
} else {
  const components = JSON.parse(readFileSync(COMPONENTS_FILE, 'utf8'));
  const structure = JSON.parse(readFileSync(STRUCTURE_FILE, 'utf8'));
  const { space } = await mapi('GET', '');
  console.log(
    `${apply ? 'Applying to' : 'Dry run for'} space ${space.id} (${space.name})\n`
  );
  await pushLanguages(structure.languages);
  await pushComponents(components);
  await pushFolders(structure.folders);
  await pushStories(structure.stories);
  if (!apply) console.log('\nNothing written. Re-run with --apply.');
}
