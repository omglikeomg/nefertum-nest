import { DomainError } from '../../../shared/domain-error';

export const SCALE_BUCKET_DEFINITIONS = {
  GENDER: [
    { code: 0, label: 'MORE_MASCULINE' },
    { code: 1, label: 'LEANING_MASCULINE' },
    { code: 2, label: 'BALANCED' },
    { code: 3, label: 'LEANING_FEMININE' },
    { code: 4, label: 'MORE_FEMININE' },
  ],
  LONGEVITY: [
    { code: 0, label: 'POOR' },
    { code: 1, label: 'WEAK' },
    { code: 2, label: 'MODERATE' },
    { code: 3, label: 'LONG_LASTING' },
    { code: 4, label: 'BEAST_MODE' },
  ],
  SILLAGE: [
    { code: 0, label: 'INTIMATE' },
    { code: 1, label: 'SOFT' },
    { code: 2, label: 'MODERATE' },
    { code: 3, label: 'STRONG' },
    { code: 4, label: 'ENORMOUS' },
  ],
  VALUE: [
    { code: 0, label: 'OVERPRICED' },
    { code: 1, label: 'FAIR' },
    { code: 2, label: 'GOOD' },
    { code: 3, label: 'VERY_GOOD' },
    { code: 4, label: 'EXCEPTIONAL' },
  ],
} as const;

export type ScaleMetric = keyof typeof SCALE_BUCKET_DEFINITIONS;
export type ScaleBucketCode = number;

type BucketCounts = Readonly<Record<ScaleBucketCode, number>>;

interface ScaleHistogramProps {
  metric: ScaleMetric;
  buckets: BucketCounts;
  totalVotes: number;
}

export class ScaleHistogram {
  private constructor(private readonly props: ScaleHistogramProps) {
    Object.freeze(this.props.buckets);
    Object.freeze(this.props);
  }

  static empty(metric: ScaleMetric): ScaleHistogram {
    const buckets = Object.fromEntries(
      SCALE_BUCKET_DEFINITIONS[metric].map((definition) => [definition.code, 0]),
    ) as Record<ScaleBucketCode, number>;

    return new ScaleHistogram({
      metric,
      buckets,
      totalVotes: 0,
    });
  }

  static fromPersistence(
    metric: ScaleMetric,
    rawBuckets: unknown,
    rawTotalVotes?: number,
  ): ScaleHistogram {
    const buckets = ScaleHistogram.normalizeBuckets(metric, rawBuckets);

    const totalVotes =
      typeof rawTotalVotes === 'number' && Number.isFinite(rawTotalVotes)
        ? rawTotalVotes
        : Object.values(buckets).reduce((sum, count) => sum + count, 0);

    return new ScaleHistogram({
      metric,
      buckets,
      totalVotes,
    });
  }

  get metric(): ScaleMetric {
    return this.props.metric;
  }

  get buckets(): BucketCounts {
    return this.props.buckets;
  }

  get totalVotes(): number {
    return this.props.totalVotes;
  }

  increment(bucket: ScaleBucketCode): ScaleHistogram {
    ScaleHistogram.assertBucket(this.metric, bucket);

    const currentCount = this.props.buckets[bucket] ?? 0;

    return new ScaleHistogram({
      metric: this.metric,
      buckets: {
        ...this.props.buckets,
        [bucket]: currentCount + 1,
      },
      totalVotes: this.totalVotes + 1,
    });
  }

  decrement(bucket: ScaleBucketCode): ScaleHistogram {
    ScaleHistogram.assertBucket(this.metric, bucket);

    const currentCount = this.props.buckets[bucket] ?? 0;

    if (currentCount <= 0) {
      throw new DomainError(
        `Cannot decrement bucket ${bucket} for metric ${this.metric}.`,
        'INVALID_HISTOGRAM_DECREMENT',
      );
    }

    if (this.totalVotes <= 0) {
      throw new DomainError(
        `Cannot decrement total votes for metric ${this.metric}.`,
        'INVALID_HISTOGRAM_DECREMENT',
      );
    }

    return new ScaleHistogram({
      metric: this.metric,
      buckets: {
        ...this.props.buckets,
        [bucket]: currentCount - 1,
      },
      totalVotes: this.totalVotes - 1,
    });
  }

  replaceVote(
    previousBucket: ScaleBucketCode | null,
    nextBucket: ScaleBucketCode,
  ): ScaleHistogram {
    if (previousBucket === nextBucket) {
      return this;
    }

    let nextHistogram: ScaleHistogram = this;

    if (previousBucket !== null) {
      nextHistogram = nextHistogram.decrement(previousBucket);
    }

    return nextHistogram.increment(nextBucket);
  }

  toJSON(): {
    metric: ScaleMetric;
    buckets: BucketCounts;
    totalVotes: number;
  } {
    return {
      metric: this.metric,
      buckets: this.props.buckets,
      totalVotes: this.props.totalVotes,
    };
  }

  private static assertBucket(metric: ScaleMetric, bucket: ScaleBucketCode): void {
    if (!Number.isInteger(bucket)) {
      throw new DomainError(
        `Scale bucket for metric ${metric} must be an integer.`,
        'INVALID_SCALE_BUCKET',
      );
    }

    const isValid = SCALE_BUCKET_DEFINITIONS[metric].some(
      (definition) => definition.code === bucket,
    );

    if (!isValid) {
      throw new DomainError(
        `Invalid bucket ${bucket} for metric ${metric}.`,
        'INVALID_SCALE_BUCKET',
      );
    }
  }

  private static normalizeBuckets(
    metric: ScaleMetric,
    raw: unknown,
  ): Record<ScaleBucketCode, number> {
    const definitions = SCALE_BUCKET_DEFINITIONS[metric];

    const buckets = Object.fromEntries(
      definitions.map((definition) => [definition.code, 0]),
    ) as Record<ScaleBucketCode, number>;

    if (raw === null || raw === undefined) {
      return buckets;
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      throw new DomainError(
        `Invalid histogram buckets for metric ${metric}.`,
        'INVALID_HISTOGRAM_BUCKET_STORAGE',
      );
    }

    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const code = Number(key);

      const definition = definitions.find((item) => item.code === code);

      if (!definition) {
        throw new DomainError(
          `Unknown histogram bucket ${key} for metric ${metric}.`,
          'INVALID_HISTOGRAM_BUCKET_STORAGE',
        );
      }

      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        !Number.isInteger(value) ||
        value < 0
      ) {
        throw new DomainError(
          `Histogram bucket ${key} for metric ${metric} must be a non-negative integer.`,
          'INVALID_HISTOGRAM_BUCKET_STORAGE',
        );
      }

      buckets[code] = value;
    }

    return buckets;
  }
}
