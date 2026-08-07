export interface SubmitPerfumeInput {
  submittedBy?: string | null;
  payload: unknown;
}

export class SubmitPerfumeCommand {
  constructor(public readonly input: SubmitPerfumeInput) {}
}

export interface SubmitPerfumeResult {
  submissionId: string;
  status: 'QUEUED';
}
