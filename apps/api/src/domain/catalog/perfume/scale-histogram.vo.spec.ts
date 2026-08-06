import { DomainError } from '../../shared/domain-error';
import { ScaleHistogram } from './value-objects/scale-histogram.vo';

describe('ScaleHistogram', () => {
  describe('empty', () => {
    it('starts with all buckets at 0 and totalVotes 0 for GENDER', () => {
      const h = ScaleHistogram.empty('GENDER');
      expect(h.totalVotes).toBe(0);
      expect(h.buckets).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
    });

    it('works for every defined metric', () => {
      for (const metric of ['GENDER', 'LONGEVITY', 'SILLAGE', 'VALUE'] as const) {
        const h = ScaleHistogram.empty(metric);
        expect(h.metric).toBe(metric);
        expect(h.totalVotes).toBe(0);
      }
    });
  });

  describe('increment', () => {
    it('moves one vote into the chosen bucket and bumps totalVotes', () => {
      let h = ScaleHistogram.empty('LONGEVITY');
      h = h.increment(3);
      expect(h.buckets[3]).toBe(1);
      expect(h.totalVotes).toBe(1);
    });

    it('rejects an out-of-range bucket', () => {
      const h = ScaleHistogram.empty('GENDER');
      expect(() => h.increment(5)).toThrow(DomainError);
      try {
        h.increment(5);
      } catch (e) {
        expect((e as DomainError).code).toBe('INVALID_SCALE_BUCKET');
      }
    });
  });

  describe('decrement', () => {
    it('removes a vote when the bucket is positive', () => {
      let h = ScaleHistogram.empty('VALUE').increment(4);
      h = h.decrement(4);
      expect(h.buckets[4]).toBe(0);
      expect(h.totalVotes).toBe(0);
    });

    it('throws when the bucket is empty (no votes to remove)', () => {
      const h = ScaleHistogram.empty('SILLAGE');
      expect(() => h.decrement(0)).toThrow(DomainError);
    });
  });

  describe('replaceVote', () => {
    it('is a no-op when previous === next', () => {
      let h = ScaleHistogram.empty('GENDER').increment(2);
      const before = h;
      const after = h.replaceVote(2, 2);
      expect(after).toBe(before);
      expect(after.totalVotes).toBe(1);
    });

    it('removes the previous bucket and adds the next when they differ', () => {
      let h = ScaleHistogram.empty('GENDER').increment(1);
      h = h.replaceVote(1, 3);
      expect(h.buckets[1]).toBe(0);
      expect(h.buckets[3]).toBe(1);
      expect(h.totalVotes).toBe(1);
    });

    it('treats previousBucket=null as an addition', () => {
      const h = ScaleHistogram.empty('LONGEVITY').replaceVote(null, 4);
      expect(h.buckets[4]).toBe(1);
      expect(h.totalVotes).toBe(1);
    });
  });

  describe('fromPersistence', () => {
    it('rehydrates from JSON-shaped raw buckets', () => {
      const raw = { 0: 10, 1: 22, 2: 5, 3: 18, 4: 2 };
      const h = ScaleHistogram.fromPersistence('GENDER', raw, 57);
      expect(h.totalVotes).toBe(57);
      expect(h.buckets[3]).toBe(18);
    });

    it('rejects unknown bucket codes', () => {
      expect(() => ScaleHistogram.fromPersistence('GENDER', { 7: 1 })).toThrow(DomainError);
    });

    it('rejects negative counts', () => {
      expect(() => ScaleHistogram.fromPersistence('VALUE', { 0: -1 })).toThrow(DomainError);
    });
  });
});
