import { DomainError } from '../../../shared/domain-error';

interface CanonicalNoteAlias {
  alias: string;
  normalized: string;
}

export class CanonicalNote {
  private readonly _aliases: readonly CanonicalNoteAlias[];

  private constructor(
    readonly id: string,
    readonly canonicalName: string,
    aliases: readonly string[],
    readonly description?: string,
  ) {
    const aliasMap = new Map<string, string>();

    for (const alias of aliases) {
      const normalized = CanonicalNote.normalizeAlias(alias);

      if (!normalized) {
        continue;
      }

      if (!aliasMap.has(normalized)) {
        aliasMap.set(normalized, alias.trim());
      }
    }

    this._aliases = [...aliasMap.entries()].map(([normalized, alias]) => ({
      alias,
      normalized,
    }));

    Object.freeze(this._aliases);
    Object.freeze(this);
  }

  static create(props: {
    id: string;
    canonicalName: string;
    aliases?: readonly string[];
    description?: string;
  }): CanonicalNote {
    if (!props.canonicalName.trim()) {
      throw new DomainError(
        'Canonical note name is required.',
        'CANONICAL_NAME_REQUIRED',
      );
    }

    return new CanonicalNote(
      props.id,
      props.canonicalName.trim(),
      props.aliases ?? [],
      props.description,
    );
  }

  get aliases(): readonly string[] {
    return this._aliases.map((alias) => alias.alias);
  }

  matches(rawCandidate: string): boolean {
    const normalizedCandidate = CanonicalNote.normalizeAlias(rawCandidate);

    if (!normalizedCandidate) {
      return false;
    }

    const normalizedCanonical = CanonicalNote.normalizeAlias(this.canonicalName);

    if (normalizedCandidate === normalizedCanonical) {
      return true;
    }

    return this._aliases.some(
      (alias) => alias.normalized === normalizedCandidate,
    );
  }

  hasAlias(rawAlias: string): boolean {
    const normalizedAlias = CanonicalNote.normalizeAlias(rawAlias);

    if (!normalizedAlias) {
      return false;
    }

    return this._aliases.some((alias) => alias.normalized === normalizedAlias);
  }

  addAlias(rawAlias: string): CanonicalNote {
    const normalizedAlias = CanonicalNote.normalizeAlias(rawAlias);

    if (!normalizedAlias) {
      throw new DomainError(
        'Note alias cannot be empty.',
        'EMPTY_NOTE_ALIAS',
      );
    }

    if (this.hasAlias(rawAlias)) {
      return this;
    }

    return new CanonicalNote(
      this.id,
      this.canonicalName,
      [...this.aliases, rawAlias.trim()],
      this.description,
    );
  }

  static resolve(
    rawCandidate: string,
    candidates: readonly CanonicalNote[],
  ): CanonicalNote | undefined {
    const normalizedCandidate = CanonicalNote.normalizeAlias(rawCandidate);

    if (!normalizedCandidate) {
      return undefined;
    }

    return candidates.find((candidate) => candidate.matches(rawCandidate));
  }

  static normalizeAlias(raw: string): string {
    return raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
