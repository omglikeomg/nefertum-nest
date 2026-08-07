import { get as levenshteinDistance } from 'fast-levenshtein';
import { mockDeep } from 'jest-mock-extended';

import {
  CanonicalNoteResolverService,
  type ResolverTx,
} from './canonical-note-resolver.service';

function makeTx() {
  return mockDeep<ResolverTx>();
}

describe('CanonicalNoteResolverService', () => {
  it('returns null for empty rawName', async () => {
    const tx = makeTx();
    const service = new CanonicalNoteResolverService();
    expect(await service.resolve('   ', tx)).toBeNull();
    expect(tx.note.findFirst).not.toHaveBeenCalled();
  });

  it('returns null for whitespace-only rawName', async () => {
    const tx = makeTx();
    const service = new CanonicalNoteResolverService();
    expect(await service.resolve('\t\n', tx)).toBeNull();
  });

  it('returns existing noteId for case-insensitive canonicalName match (no new alias)', async () => {
    const tx = makeTx();
    tx.note.findFirst.mockResolvedValueOnce({
      id: 'note-1',
      canonicalName: 'Ambroxan',
      slug: 'ambroxan',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      aliases: [],
    } as never);

    const service = new CanonicalNoteResolverService();
    const result = await service.resolve('ambroxan', tx);

    expect(result).toEqual({ noteId: 'note-1', createdAlias: false });
    expect(tx.noteAlias.create).not.toHaveBeenCalled();
    expect(tx.note.create).not.toHaveBeenCalled();
  });

  it('returns existing noteId for NoteAlias match (no new alias)', async () => {
    const tx = makeTx();
    tx.note.findFirst.mockResolvedValueOnce({
      id: 'note-2',
      canonicalName: 'Vanilla',
      slug: 'vanilla',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      aliases: [],
    } as never);

    const service = new CanonicalNoteResolverService();
    const result = await service.resolve('vanille', tx);

    expect(result).toEqual({ noteId: 'note-2', createdAlias: false });
    expect(tx.noteAlias.create).not.toHaveBeenCalled();
  });

  it('diacritic-insensitive: Ambróxan resolves to existing Ambroxan via tier 2 (alias match)', async () => {
    const tx = makeTx();
    tx.note.findFirst.mockResolvedValueOnce({
      id: 'note-3',
      canonicalName: 'Ambroxan',
      slug: 'ambroxan',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      aliases: [
        {
          id: 'alias-1',
          noteId: 'note-3',
          alias: 'Ambroxan',
          normalizedAlias: 'ambroxan',
          createdAt: new Date(),
        },
      ],
    } as never);

    const service = new CanonicalNoteResolverService();
    const result = await service.resolve('Ambróxan', tx);

    expect(result).toEqual({ noteId: 'note-3', createdAlias: false });
    expect(tx.noteAlias.create).not.toHaveBeenCalled();
  });

  it('Levenshtein distance 1: returns existing noteId, createdAlias: true', async () => {
    // levenshteinDistance('Bergamott', 'Bergamot') = 1
    expect(levenshteinDistance('Bergamott', 'Bergamot')).toBe(1);

    const tx = makeTx();
    tx.note.findFirst.mockResolvedValueOnce(null);
    tx.note.findMany.mockResolvedValueOnce([
      { id: 'note-4', canonicalName: 'Bergamot' },
    ] as never);
    tx.noteAlias.create.mockResolvedValueOnce({} as never);

    const service = new CanonicalNoteResolverService();
    const result = await service.resolve('Bergamott', tx);

    expect(result).toEqual({ noteId: 'note-4', createdAlias: true });
    expect(tx.noteAlias.create).toHaveBeenCalledTimes(1);
    expect(tx.note.create).not.toHaveBeenCalled();
  });

  it('Levenshtein distance 2: returns existing noteId, createdAlias: true', async () => {
    // levenshteinDistance('Bergamottt', 'Bergamot') = 2
    expect(levenshteinDistance('Bergamottt', 'Bergamot')).toBe(2);

    const tx = makeTx();
    tx.note.findFirst.mockResolvedValueOnce(null);
    tx.note.findMany.mockResolvedValueOnce([
      { id: 'note-5', canonicalName: 'Bergamot' },
    ] as never);
    tx.noteAlias.create.mockResolvedValueOnce({} as never);

    const service = new CanonicalNoteResolverService();
    const result = await service.resolve('Bergamottt', tx);

    expect(result).toEqual({ noteId: 'note-5', createdAlias: true });
    expect(tx.noteAlias.create).toHaveBeenCalledTimes(1);
  });

  it('Levenshtein distance 3 (boundary): MUST NOT match — falls through to tier 4 and creates a new Note + NoteAlias', async () => {
    // levenshteinDistance('Bergamotttt', 'Bergamot') = 3
    expect(levenshteinDistance('Bergamotttt', 'Bergamot')).toBe(3);

    const tx = makeTx();
    tx.note.findFirst.mockResolvedValueOnce(null);
    tx.note.findMany.mockResolvedValueOnce([
      { id: 'note-6', canonicalName: 'Bergamot' },
    ] as never);
    tx.note.create.mockResolvedValueOnce({
      id: 'note-new',
      canonicalName: 'Bergamotttt',
      slug: 'bergamotttt',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const service = new CanonicalNoteResolverService();
    const result = await service.resolve('Bergamotttt', tx);

    expect(result).toEqual({ noteId: 'note-new', createdAlias: false });
    expect(tx.noteAlias.create).not.toHaveBeenCalled();
    expect(tx.note.create).toHaveBeenCalledTimes(1);
  });

  it('No match (empty DB): creates new Note + NoteAlias', async () => {
    const tx = makeTx();
    tx.note.findFirst.mockResolvedValueOnce(null);
    tx.note.findMany.mockResolvedValueOnce([]);
    tx.note.create.mockResolvedValueOnce({
      id: 'note-7',
      canonicalName: 'Frankincense',
      slug: 'frankincense',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const service = new CanonicalNoteResolverService();
    const result = await service.resolve('Frankincense', tx);

    expect(result?.noteId).toBe('note-7');
    expect(result?.createdAlias).toBe(false);
  });
});
