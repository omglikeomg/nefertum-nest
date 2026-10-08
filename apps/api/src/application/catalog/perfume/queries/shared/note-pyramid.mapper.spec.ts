import { toNotePyramid } from './note-pyramid.mapper';

describe('toNotePyramid', () => {
  it('groups assignments by level and keeps their order', () => {
    const pyramid = toNotePyramid([
      { level: 'TOP', order: 0, note: { id: 'n1', canonicalName: 'Grapefruit', slug: 'grapefruit' } },
      { level: 'BASE', order: 0, note: { id: 'n3', canonicalName: 'Vetiver', slug: 'vetiver' } },
      { level: 'TOP', order: 1, note: { id: 'n2', canonicalName: 'Lemon', slug: 'lemon' } },
      { level: 'HEART', order: 0, note: { id: 'n4', canonicalName: 'Ginger', slug: 'ginger' } },
    ]);
    expect(pyramid.top.map((n) => n.noteId)).toEqual(['n1', 'n2']);
    expect(pyramid.heart).toEqual([{ noteId: 'n4', canonicalName: 'Ginger', slug: 'ginger', order: 0 }]);
    expect(pyramid.base.map((n) => n.slug)).toEqual(['vetiver']);
  });

  it('returns three empty tiers for no assignments', () => {
    expect(toNotePyramid([])).toEqual({ top: [], heart: [], base: [] });
  });
});
