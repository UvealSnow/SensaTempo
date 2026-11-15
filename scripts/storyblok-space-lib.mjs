// Pure helpers for scripts/storyblok-space.mjs (tested with node --test)

const withoutId = (field) => {
  const copy = { ...field };
  delete copy.id;
  return copy;
};

const KEPT = [
  'name',
  'display_name',
  'description',
  'is_root',
  'is_nestable',
  'preview_field',
];

/** A component as stored in the repo: no ids or timestamps, its group by name, fields by `pos`. */
export function normalizeComponent(component, groupNames) {
  const kept = Object.fromEntries(
    KEPT.filter((key) => component[key] != null && component[key] !== '').map(
      (key) => [key, component[key]]
    )
  );
  const schema = Object.fromEntries(
    Object.entries(component.schema ?? {})
      .sort(([, a], [, b]) => (a.pos ?? 0) - (b.pos ?? 0))
      .map(([key, field]) => [key, withoutId(field)])
  );
  const group = groupNames.get(component.component_group_uuid) ?? null;
  return {
    ...kept,
    is_root: Boolean(component.is_root),
    is_nestable: Boolean(component.is_nestable),
    group,
    schema,
  };
}

const sorted = (value) =>
  Array.isArray(value)
    ? value.map(sorted)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sorted(value[key])])
        )
      : value;

export const componentsEqual = (a, b) =>
  JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
