import type { SubmitNewPerfumeInput } from './submit-new-perfume.types';

export class SubmitNewPerfumeCommand {
  constructor(public readonly input: SubmitNewPerfumeInput) {}
}
