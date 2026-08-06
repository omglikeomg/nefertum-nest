import { DomainError } from '../../shared/domain-error';
import { CanonicalNote } from './entities/canonical-note.entity';

describe('CanonicalNote', () => {
  describe('normalizeAlias', () => {
    it('lowercases and strips diacritics', () => {
      expect(CanonicalNote.normalizeAlias('  Ambróxan  ')).toBe('ambroxan');
      expect(CanonicalNote.normalizeAlias('AMBROXIDE')).toBe('ambroxide');
    });

    it('collapses punctuation to spaces', () => {
      expect(CanonicalNote.normalizeAlias('Ambroxan!')).toBe('ambroxan');
    });
  });

  describe('create', () => {
    it('rejects an empty canonical name', () => {
      expect(() => CanonicalNote.create({ id: 'x', canonicalName: '   ' })).toThrow(DomainError);
    });

    it('deduplicates aliases on creation', () => {
      const note = CanonicalNote.create({
        id: 'x',
        canonicalName: 'Ambroxan',
        aliases: ['Ambrofix', 'ambrofix', 'ambroxide'],
      });
      expect(new Set(note.aliases)).toEqual(new Set(['Ambrofix', 'ambroxide']));
    });
  });

  describe('matches', () => {
    it('matches the canonical name case-insensitively', () => {
      const note = CanonicalNote.create({ id: 'x', canonicalName: 'Ambroxan' });
      expect(note.matches('AMBROXAN')).toBe(true);
    });

    it('matches an alias', () => {
      const note = CanonicalNote.create({
        id: 'x',
        canonicalName: 'Ambroxan',
        aliases: ['ambroxide'],
      });
      expect(note.matches('Ambroxide')).toBe(true);
    });

    it('returns false on unrelated input', () => {
      const note = CanonicalNote.create({ id: 'x', canonicalName: 'Ambroxan' });
      expect(note.matches('vanilla')).toBe(false);
    });
  });

  describe('addAlias', () => {
    it('is idempotent — adding the same alias twice is a no-op', () => {
      const note = CanonicalNote.create({
        id: 'x',
        canonicalName: 'Ambroxan',
        aliases: ['ambroxide'],
      });
      const once = note.addAlias('ambroxide');
      const twice = once.addAlias('Ambroxide');
      expect(new Set(twice.aliases)).toEqual(new Set(['ambroxide']));
    });
  });

  describe('resolve', () => {
    it('returns the first candidate that matches the raw name', () => {
      const a = CanonicalNote.create({ id: 'a', canonicalName: 'Vanilla' });
      const b = CanonicalNote.create({ id: 'b', canonicalName: 'Ambroxan', aliases: ['ambroxide'] });
      expect(CanonicalNote.resolve('ambroxide', [a, b])?.id).toBe('b');
    });

    it('returns undefined when no candidate matches', () => {
      const a = CanonicalNote.create({ id: 'a', canonicalName: 'Vanilla' });
      expect(CanonicalNote.resolve('grapefruit', [a])).toBeUndefined();
    });
  });
});
