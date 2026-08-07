import { CommandBus } from '@nestjs/cqrs';

import { SubmitPerfumeCommand } from '../../../../application/submissions/commands/submit-perfume/submit-perfume.command';
import { PerfumeSubmissionResolver, SubmitPerfumeGqlInput } from './perfume-submission.resolver';

describe('PerfumeSubmissionResolver', () => {
  let resolver: PerfumeSubmissionResolver;
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    resolver = new PerfumeSubmissionResolver(commandBus as unknown as CommandBus);
  });

  it('submitPerfume invokes SubmitPerfumeCommand and returns submissionId', async () => {
    commandBus.execute.mockResolvedValue({
      submissionId: 'sub-1',
      status: 'QUEUED',
    });

    const input: SubmitPerfumeGqlInput = {
      name: 'Acme Eau de Parfum',
      brandName: 'Acme',
      rawNotes: ['Bergamot'],
    };

    const result = await resolver.submitPerfume(input);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SubmitPerfumeCommand));
    const arg = commandBus.execute.mock.calls[0][0];
    expect(arg.input.submittedBy).toBeNull();
    expect(arg.input.payload).toEqual(input);
    expect(result).toBe('sub-1');
  });

  it('propagates validation errors from the handler', async () => {
    commandBus.execute.mockRejectedValue(new Error('Invalid submission payload.'));

    await expect(resolver.submitPerfume({ name: '' } as SubmitPerfumeGqlInput)).rejects.toThrow(
      /Invalid submission payload/,
    );
  });
});
