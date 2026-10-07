export type FlexSize = { sm?: string; md?: string; lg?: string };
export type FlexStart = { sm?: string; md?: string; lg?: string };
export type VerticalAlign = 'start' | 'center' | 'end';

const sizeMap: Record<string, string> = {
  '1/12': 'col-span-1',
  '2/12': 'col-span-2',
  '3/12': 'col-span-3',
  '4/12': 'col-span-4',
  '5/12': 'col-span-5',
  '6/12': 'col-span-6',
  '7/12': 'col-span-7',
  '8/12': 'col-span-8',
  '9/12': 'col-span-9',
  '10/12': 'col-span-10',
  '11/12': 'col-span-11',
  '12/12': 'col-span-12',
};

const startMap: Record<string, string> = {
  '1/12': 'col-start-1',
  '2/12': 'col-start-2',
  '3/12': 'col-start-3',
  '4/12': 'col-start-4',
  '5/12': 'col-start-5',
  '6/12': 'col-start-6',
  '7/12': 'col-start-7',
  '8/12': 'col-start-8',
  '9/12': 'col-start-9',
  '10/12': 'col-start-10',
  '11/12': 'col-start-11',
  '12/12': 'col-start-12',
};

const verticalAlignMap: Record<VerticalAlign, string> = {
  start: 'self-start',
  center: 'self-center',
  end: 'self-end',
};

const applyResponsiveMap = (
  values: Record<string, string>,
  map: Record<string, string>,
  fallback?: string
): string => {
  let result = '';

  for (const [breakpoint, value] of Object.entries(values)) {
    const mapped = map[value] ?? fallback;
    if (!mapped) continue;

    if (breakpoint === 'sm') {
      result += ` ${mapped}`;
      continue;
    }

    result += ` ${breakpoint}:${mapped.replaceAll(' ', ` ${breakpoint}:`)}`;
  }

  return result;
};

export const getColSpans = (
  sizes: FlexSize,
  invalidSizeClass: string
): string => applyResponsiveMap(sizes, sizeMap, invalidSizeClass);

export const getColStarts = (starts: FlexStart): string =>
  applyResponsiveMap(starts, startMap);

export const getVerticalAlignment = (vertical?: VerticalAlign): string =>
  vertical
    ? (verticalAlignMap[vertical] ?? verticalAlignMap.start)
    : verticalAlignMap.start;

// Grid fields of the `picture` and `text` Storyblok blocks
export interface GridBlok {
  size?: string;
  start?: string;
  size_tablet?: string;
  start_tablet?: string;
  vertical?: string;
}

/** Placement of a block: full width on phones, then the tablet (md) and desktop (lg) settings. */
export function blokPlacement(blok: GridBlok): {
  size: FlexSize;
  start: FlexStart;
  vertical: VerticalAlign;
} {
  const size = blok.size || '12/12';
  const sizeTablet = blok.size_tablet || size;
  const start = blok.start || undefined;
  const startTablet = blok.start_tablet || start;
  return {
    size: { sm: '12/12', md: sizeTablet, lg: size },
    start: {
      ...(startTablet ? { md: startTablet } : {}),
      ...(start ? { lg: start } : {}),
    },
    vertical: (['start', 'center', 'end'] as const).includes(
      blok.vertical as VerticalAlign
    )
      ? (blok.vertical as VerticalAlign)
      : 'start',
  };
}
