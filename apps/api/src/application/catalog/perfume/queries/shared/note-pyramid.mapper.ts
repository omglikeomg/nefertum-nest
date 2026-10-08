import type {
  PerfumeDetailsNote,
  PerfumeDetailsNotePyramid,
} from '../get-perfume-details/get-perfume-details.types';

export interface NoteAssignmentRow {
  level: string; // 'TOP' | 'HEART' | 'BASE' from Prisma's PyramidLevel enum
  order: number;
  note: { id: string; canonicalName: string; slug: string };
}

export function toNotePyramid(
  assignments: readonly NoteAssignmentRow[],
): PerfumeDetailsNotePyramid {
  const notes: PerfumeDetailsNotePyramid = {
    top: [],
    heart: [],
    base: [],
  };

  for (const assignment of assignments) {
    const note: PerfumeDetailsNote = {
      noteId: assignment.note.id,
      canonicalName: assignment.note.canonicalName,
      slug: assignment.note.slug,
      order: assignment.order,
    };

    if (assignment.level === 'TOP') {
      notes.top.push(note);
    }

    if (assignment.level === 'HEART') {
      notes.heart.push(note);
    }

    if (assignment.level === 'BASE') {
      notes.base.push(note);
    }
  }

  return notes;
}
