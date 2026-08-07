export interface RejectSubmissionInput {
  submissionId: string;
  reason: string;
  rejectedBy?: string | null;
}

export class RejectSubmissionCommand {
  constructor(public readonly input: RejectSubmissionInput) {}
}

export interface RejectSubmissionResult {
  submissionId: string;
  status: 'REJECTED';
}
