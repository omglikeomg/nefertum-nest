import { DomainError } from '../../shared/domain-error';
import {
  NoteAddedToPyramidEvent,
  Perfume,
  PerfumeCreatedEvent,
  ScaleVoteRecordedEvent,
} from './entities/perfume.aggregate';

describe('Perfume aggregate', () => {
  describe('create', () => {
    it('builds a valid aggregate and emits PerfumeCreatedEvent', () => {
      const p = Perfume.create({ brandId: 'brand-1', name: 'Sauvage', releaseYear: 2015 });
      expect(p.id).toEqual(expect.any(String));
      expect(p.brandId).toBe('brand-1');
      expect(p.notes).toHaveLength(0);
      expect(p.domainEvents).toHaveLength(1);
      expect(p.domainEvents[0]).toBeInstanceOf(PerfumeCreatedEvent);
    });

    it('throws BRAND_REQUIRED when brandId is empty', () => {
      expect(() => Perfume.create({ brandId: '', name: 'X' })).toThrow(DomainError);
    });

    it('throws NAME_REQUIRED for whitespace-only names', () => {
      expect(() => Perfume.create({ brandId: 'b', name: '   ' })).toThrow(DomainError);
    });

    it('throws INVALID_RELEASE_YEAR for implausible years', () => {
      expect(() => Perfume.create({ brandId: 'b', name: 'X', releaseYear: 999 })).toThrow(DomainError);
      expect(() => Perfume.create({ brandId: 'b', name: 'X', releaseYear: 4000 })).toThrow(DomainError);
    });
  });

  describe('addNoteToPyramid', () => {
    it('assigns a note and emits NoteAddedToPyramidEvent', () => {
      const p = Perfume.create({ brandId: 'b', name: 'X' });
      p.clearDomainEvents();
      p.addNoteToPyramid('note-1', 'TOP');
      expect(p.notes).toEqual([{ noteId: 'note-1', level: 'TOP' }]);
      expect(p.domainEvents[0]).toBeInstanceOf(NoteAddedToPyramidEvent);
    });

    it('rejects a duplicate (noteId, level) pair', () => {
      const p = Perfume.create({ brandId: 'b', name: 'X' });
      p.addNoteToPyramid('note-1', 'TOP');
      expect(() => p.addNoteToPyramid('note-1', 'TOP')).toThrow(DomainError);
    });

    it('rejects an invalid pyramid level', () => {
      const p = Perfume.create({ brandId: 'b', name: 'X' });
      expect(() => p.addNoteToPyramid('note-1', 'BOGUS' as never)).toThrow(DomainError);
    });
  });

  describe('recordHistogramVote', () => {
    it('increments the chosen bucket and emits ScaleVoteRecordedEvent', () => {
      const p = Perfume.create({ brandId: 'b', name: 'X' });
      p.clearDomainEvents();
      p.recordHistogramVote('GENDER', 3, null);
      expect(p.getScaleHistogram('GENDER').buckets[3]).toBe(1);
      expect(p.domainEvents[0]).toBeInstanceOf(ScaleVoteRecordedEvent);
    });

    it('replaces a vote (decrements previous, increments next)', () => {
      const p = Perfume.create({ brandId: 'b', name: 'X' });
      p.recordHistogramVote('LONGEVITY', 2, null);
      p.recordHistogramVote('LONGEVITY', 4, 2);
      const h = p.getScaleHistogram('LONGEVITY');
      expect(h.buckets[2]).toBe(0);
      expect(h.buckets[4]).toBe(1);
      expect(h.totalVotes).toBe(1);
    });
  });

  describe('clearDomainEvents', () => {
    it('empties the event log', () => {
      const p = Perfume.create({ brandId: 'b', name: 'X' });
      expect(p.domainEvents.length).toBeGreaterThan(0);
      p.clearDomainEvents();
      expect(p.domainEvents).toHaveLength(0);
    });
  });
});
