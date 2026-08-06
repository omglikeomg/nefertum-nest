import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../shared/aggregate-root';
import { BaseDomainEvent } from '../../../shared/domain-event';
import { DomainError } from '../../../shared/domain-error';
import {
  ScaleHistogram,
  ScaleMetric,
} from '../value-objects/scale-histogram.vo';

export const PYRAMID_LEVELS = ['TOP', 'HEART', 'BASE'] as const;

export type PyramidLevel = (typeof PYRAMID_LEVELS)[number];

export function isPyramidLevel(value: unknown): value is PyramidLevel {
  return PYRAMID_LEVELS.includes(value as PyramidLevel);
}

export interface PerfumeNoteAssignment {
  noteId: string;
  level: PyramidLevel;
}

export class PerfumeCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly brandId: string,
    public readonly name: string,
  ) {
    super(aggregateId);
  }
}

export class NoteAddedToPyramidEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly noteId: string,
    public readonly level: PyramidLevel,
  ) {
    super(aggregateId);
  }
}

export class ScaleVoteRecordedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly metric: ScaleMetric,
    public readonly bucket: number,
    public readonly previousBucket: number | null,
  ) {
    super(aggregateId);
  }
}

interface PerfumeProps {
  id: string;
  brandId: string;
  collectionId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  storeUrl: string | null;
  releaseYear: number | null;
  discontinued: boolean;
  discontinuationNotes: string | null;
  notes: PerfumeNoteAssignment[];
  scaleHistograms: Record<ScaleMetric, ScaleHistogram>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePerfumeProps {
  id?: string;
  brandId: string;
  collectionId?: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  storeUrl?: string | null;
  releaseYear?: number | null;
  discontinued?: boolean;
  discontinuationNotes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Perfume extends AggregateRoot {
  private constructor(private readonly props: PerfumeProps) {
    super();
  }

  static create(input: CreatePerfumeProps): Perfume {
    if (!input.brandId) {
      throw new DomainError('Perfume brand is required.', 'BRAND_REQUIRED');
    }

    if (!input.name.trim()) {
      throw new DomainError('Perfume name is required.', 'NAME_REQUIRED');
    }

    if (input.releaseYear !== null && input.releaseYear !== undefined) {
      const currentYear = new Date().getFullYear();

      if (
        !Number.isInteger(input.releaseYear) ||
        input.releaseYear < 1300 ||
        input.releaseYear > currentYear + 1
      ) {
        throw new DomainError(
          'Invalid perfume release year.',
          'INVALID_RELEASE_YEAR',
        );
      }
    }

    const id = input.id ?? randomUUID();
    const now = input.createdAt ?? new Date();

    const props: PerfumeProps = {
      id,
      brandId: input.brandId,
      collectionId: input.collectionId ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      storeUrl: input.storeUrl ?? null,
      releaseYear: input.releaseYear ?? null,
      discontinued: input.discontinued ?? false,
      discontinuationNotes: input.discontinuationNotes ?? null,
      notes: [],
      scaleHistograms: {
        GENDER: ScaleHistogram.empty('GENDER'),
        LONGEVITY: ScaleHistogram.empty('LONGEVITY'),
        SILLAGE: ScaleHistogram.empty('SILLAGE'),
        VALUE: ScaleHistogram.empty('VALUE'),
      },
      createdAt: now,
      updatedAt: now,
    };

    const aggregate = new Perfume(props);

    aggregate.addDomainEvent(
      new PerfumeCreatedEvent(id, props.brandId, props.name),
    );

    return aggregate;
  }

  static reconstitute(props: PerfumeProps): Perfume {
    return new Perfume(props);
  }

  get id(): string {
    return this.props.id;
  }

  get brandId(): string {
    return this.props.brandId;
  }

  get collectionId(): string | null {
    return this.props.collectionId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get imageUrl(): string | null {
    return this.props.imageUrl;
  }

  get storeUrl(): string | null {
    return this.props.storeUrl;
  }

  get releaseYear(): number | null {
    return this.props.releaseYear;
  }

  get discontinued(): boolean {
    return this.props.discontinued;
  }

  get discontinuationNotes(): string | null {
    return this.props.discontinuationNotes;
  }

  get notes(): readonly PerfumeNoteAssignment[] {
    return [...this.props.notes];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  getScaleHistogram(metric: ScaleMetric): ScaleHistogram {
    return this.props.scaleHistograms[metric];
  }

  addNoteToPyramid(noteId: string, level: PyramidLevel): void {
    if (!noteId) {
      throw new DomainError('Note id is required.', 'NOTE_ID_REQUIRED');
    }

    if (!isPyramidLevel(level)) {
      throw new DomainError(
        `Invalid pyramid level: ${String(level)}.`,
        'INVALID_PYRAMID_LEVEL',
      );
    }

    const alreadyAssigned = this.props.notes.some(
      (assignment) => assignment.noteId === noteId && assignment.level === level,
    );

    if (alreadyAssigned) {
      throw new DomainError(
        'Note is already assigned to this pyramid level.',
        'DUPLICATE_PYRAMID_NOTE',
      );
    }

    this.props.notes.push({
      noteId,
      level,
    });

    this.props.updatedAt = new Date();

    this.addDomainEvent(new NoteAddedToPyramidEvent(this.id, noteId, level));
  }

  recordHistogramVote(
    metric: ScaleMetric,
    bucket: number,
    previousBucket: number | null = null,
  ): void {
    const existingHistogram =
      this.props.scaleHistograms[metric] ?? ScaleHistogram.empty(metric);

    this.props.scaleHistograms[metric] = existingHistogram.replaceVote(
      previousBucket,
      bucket,
    );

    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ScaleVoteRecordedEvent(this.id, metric, bucket, previousBucket),
    );
  }
}