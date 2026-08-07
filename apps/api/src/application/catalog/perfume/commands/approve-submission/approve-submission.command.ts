import type { ApproveSubmissionInput } from './approve-submission.types';

export type CatalogLayer = 'catalog-min' | 'catalog-mid' | 'catalog-full';

export type ApproveSubmissionMode = 'tuple' | 'object';

interface ObjectArgs {
  submissionId: string;
  input: ApproveSubmissionInput;
  layers?: readonly CatalogLayer[];
}

export class ApproveSubmissionCommand {
  readonly mode: ApproveSubmissionMode;
  readonly submissionId: string;
  readonly layers?: readonly CatalogLayer[];
  readonly input?: ApproveSubmissionInput;

  constructor(arg1: string | ObjectArgs, arg2?: readonly CatalogLayer[]) {
    if (typeof arg1 === 'string') {
      this.mode = 'tuple';
      this.submissionId = arg1;
      this.layers = arg2;
    } else {
      this.mode = 'object';
      this.submissionId = arg1.submissionId;
      this.input = arg1.input;
      this.layers = arg1.layers;
    }
  }
}
