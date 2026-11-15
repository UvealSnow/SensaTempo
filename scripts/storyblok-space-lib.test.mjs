import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { componentsEqual, normalizeComponent } from './storyblok-space-lib.mjs';

const groups = new Map([['g-1', 'Content']]);
const raw = {
  id: 1,
  name: 'page',
  display_name: null,
  created_at: '2026-01-01',
  is_root: true,
  is_nestable: false,
  component_group_uuid: 'g-1',
  schema: {
    body: { type: 'bloks', pos: 1, id: 'abc' },
    title: { type: 'text', pos: 0, translatable: true, id: 'def' },
  },
};

test('normalizeComponent drops ids and timestamps, names the group, orders fields', () => {
  const component = normalizeComponent(raw, groups);
  assert.deepEqual(component, {
    name: 'page',
    is_root: true,
    is_nestable: false,
    group: 'Content',
    schema: {
      title: { type: 'text', pos: 0, translatable: true },
      body: { type: 'bloks', pos: 1 },
    },
  });
  assert.deepEqual(Object.keys(component.schema), ['title', 'body']);
});

test('componentsEqual ignores key order but not values', () => {
  const a = normalizeComponent(raw, groups);
  const b = JSON.parse(
    JSON.stringify({
      ...a,
      schema: { body: a.schema.body, title: a.schema.title },
    })
  );
  assert.ok(componentsEqual(a, b));
  b.schema.title.translatable = false;
  assert.ok(!componentsEqual(a, b));
});
