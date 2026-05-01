import type { CardVariant } from '@/src/types';

export type WantedIntent = 'buy' | 'trade' | 'either';

export type WantedList = {
  id: string;
  name: string;
  /** Cached count for quick list UI. */
  count: number;
  createdAt: number;
  updatedAt: number;
};

export type WantedItem = {
  id: string;
  listId: string;
  cardId: string;
  variant: CardVariant;
  /** Snapshot fields for fast UI (avoid fetching card details for every row). */
  name: string;
  setName?: string;
  localId?: string;
  image?: string | null;
  intent: WantedIntent;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

