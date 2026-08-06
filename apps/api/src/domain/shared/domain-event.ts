import { randomUUID } from 'node:crypto';

export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  occurredAt: Date;
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(public readonly aggregateId: string) {}
}