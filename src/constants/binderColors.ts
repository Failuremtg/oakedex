/**
 * Binder colors – Pokémon type colors (nine types).
 */

export interface BinderColorOption {
  id: string;
  hex: string;
  label: string;
}

/** Pokémon type colors (game/TCG reference). */
export const BINDER_COLOR_OPTIONS: BinderColorOption[] = [
  { id: 'normal', hex: '#A8A878', label: 'Normal' },
  { id: 'fire', hex: '#F08030', label: 'Fire' },
  { id: 'water', hex: '#6890F0', label: 'Water' },
  { id: 'grass', hex: '#78C850', label: 'Grass' },
  { id: 'electric', hex: '#F8D030', label: 'Electric' },
  { id: 'ice', hex: '#98D8D8', label: 'Ice' },
  { id: 'fighting', hex: '#C03028', label: 'Fighting' },
  { id: 'poison', hex: '#A040A0', label: 'Poison' },
  { id: 'psychic', hex: '#F85888', label: 'Psychic' },
];

const DEFAULT_BINDER_COLOR = BINDER_COLOR_OPTIONS[0].hex;

/** Resolve collection's binder color (hex). Falls back to default Normal. */
export function getBinderColorHex(binderColor?: string | null): string {
  if (!binderColor) return DEFAULT_BINDER_COLOR;
  const found = BINDER_COLOR_OPTIONS.find((c) => c.id === binderColor || c.hex === binderColor);
  if (found) return found.hex;
  if (binderColor.startsWith('#')) return binderColor;
  return DEFAULT_BINDER_COLOR;
}

export { DEFAULT_BINDER_COLOR };
