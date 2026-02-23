/**
 * Unit tests for collection helpers (pure functions only).
 */
jest.mock('@/src/lib/collectionsFirestore', () => ({
  loadBinderOrderFromFirestore: jest.fn(),
  loadCollectionsFromFirestore: jest.fn(),
  saveBinderOrderToFirestore: jest.fn(),
  saveCollectionsToFirestore: jest.fn(),
}));
jest.mock('@/src/lib/firebase', () => ({
  getFirebaseFirestore: jest.fn(() => null),
}));
jest.mock('@/src/lib/syncUser', () => ({
  getSyncUserId: jest.fn(() => null),
}));

import { getSlot, getSlotCard } from '../collections';
import type { Collection, Slot } from '@/src/types';

const mockCollection: Collection = {
  id: 'test-1',
  name: 'Test',
  type: 'collect_them_all',
  slots: [
    { key: '25', card: { cardId: 'card-pikachu', variant: 'normal' } },
    { key: '1', card: null },
    { key: '143', card: { cardId: 'card-snorlax', variant: 'holo' } },
  ],
  createdAt: 1000,
  updatedAt: 2000,
};

describe('collections', () => {
  describe('getSlot', () => {
    it('returns slot when key exists', () => {
      const slot = getSlot(mockCollection, '25');
      expect(slot).toBeDefined();
      expect(slot?.key).toBe('25');
      expect(slot?.card?.cardId).toBe('card-pikachu');
    });

    it('returns undefined when key does not exist', () => {
      expect(getSlot(mockCollection, '999')).toBeUndefined();
    });
  });

  describe('getSlotCard', () => {
    it('returns card when slot has card', () => {
      const card = getSlotCard(mockCollection, '143');
      expect(card).not.toBeNull();
      expect(card?.variant).toBe('holo');
    });

    it('returns null when slot has no card', () => {
      expect(getSlotCard(mockCollection, '1')).toBeNull();
    });

    it('returns null when slot does not exist', () => {
      expect(getSlotCard(mockCollection, '999')).toBeNull();
    });
  });
});
