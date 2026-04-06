export const CATEGORY_ORDER = [
  'foundation',
  'structure',
  'doors_windows',
  'envelope_walls',
  'envelope_roof',
  'first_fix',
  'second_fix',
  'finishing',
  'external',
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  structure: 'Structure (Framing)',
  doors_windows: 'Doors & Windows',
  envelope_walls: 'Envelope — Walls',
  envelope_roof: 'Envelope — Roof',
  first_fix: '1st Fix',
  second_fix: '2nd Fix',
  finishing: 'Finishing',
  external: 'External',
}
