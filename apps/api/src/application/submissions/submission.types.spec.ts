import { parsePerfumeSubmissionPayload, PerfumeSubmissionPayload } from './submission.types';

describe('parsePerfumeSubmissionPayload', () => {
  it('accepts a minimal valid payload', () => {
    const result = parsePerfumeSubmissionPayload({ name: 'Sample' });

    expect(result).toBeInstanceOf(PerfumeSubmissionPayload);
    expect(result.name).toBe('Sample');
  });

  it('accepts a fully-populated payload', () => {
    const result = parsePerfumeSubmissionPayload({
      name: 'Acme Eau de Parfum',
      brandName: 'Acme',
      brandId: '00000000-0000-0000-0000-000000000001',
      rawNotes: ['Bergamot', 'Rose'],
      rawPerfumers: ['Francis Kurkdjian'],
      accords: ['Woody'],
      storeUrl: 'https://example.com/perfume',
      imageUrl: 'https://example.com/perfume.jpg',
      releaseYear: 2024,
      description: 'A lovely scent.',
    });

    expect(result.name).toBe('Acme Eau de Parfum');
    expect(result.rawNotes).toEqual(['Bergamot', 'Rose']);
  });

  it('throws BadRequestException when name is missing', () => {
    expect(() => parsePerfumeSubmissionPayload({})).toThrow();
  });

  it('throws BadRequestException when name is empty string', () => {
    expect(() => parsePerfumeSubmissionPayload({ name: '' })).toThrow();
  });

  it('throws when rawNotes exceeds 50 entries', () => {
    const rawNotes = Array.from({ length: 51 }, (_, i) => `Note ${i}`);
    expect(() => parsePerfumeSubmissionPayload({ name: 'X', rawNotes })).toThrow();
  });
});
