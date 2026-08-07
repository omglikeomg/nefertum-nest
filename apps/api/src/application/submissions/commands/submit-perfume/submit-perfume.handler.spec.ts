import { Queue } from 'bullmq';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import { PERFUME_SUBMISSION_QUEUE, PerfumeSubmissionJobData } from '../../submission.types';
import { SubmitPerfumeCommand } from './submit-perfume.command';
import { SubmitPerfumeHandler } from './submit-perfume.handler';

type PrismaMock = {
  perfumeSubmission: {
    create: jest.Mock;
  };
};

const makePrisma = (): PrismaMock => ({
  perfumeSubmission: {
    create: jest.fn(),
  },
});

const makeQueue = () => {
  const add = jest.fn().mockResolvedValue({});
  return { add } as unknown as Queue<PerfumeSubmissionJobData> & {
    add: jest.Mock;
  };
};

describe('SubmitPerfumeHandler', () => {
  let handler: SubmitPerfumeHandler;
  let prisma: PrismaMock;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    queue = makeQueue();
    handler = new SubmitPerfumeHandler(prisma as unknown as PrismaService, queue);
    void PERFUME_SUBMISSION_QUEUE;
  });

  it('creates a PerfumeSubmission row at status QUEUED', async () => {
    prisma.perfumeSubmission.create.mockResolvedValue({
      id: 'sub-1',
      status: 'QUEUED',
    });

    await handler.execute(
      new SubmitPerfumeCommand({
        payload: { name: 'Acme Eau de Parfum' },
      }),
    );

    expect(prisma.perfumeSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'QUEUED',
        }),
      }),
    );
  });

  it('enqueues a BullMQ job with jobId === submissionId', async () => {
    prisma.perfumeSubmission.create.mockResolvedValue({
      id: 'sub-42',
      status: 'QUEUED',
    });

    await handler.execute(
      new SubmitPerfumeCommand({
        payload: { name: 'X' },
      }),
    );

    expect(queue.add).toHaveBeenCalledWith(
      'verify-perfume-submission',
      { submissionId: 'sub-42' },
      expect.objectContaining({
        jobId: 'sub-42',
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
      }),
    );
  });

  it('returns { submissionId, status: QUEUED }', async () => {
    prisma.perfumeSubmission.create.mockResolvedValue({
      id: 'sub-9',
      status: 'QUEUED',
    });

    const result = await handler.execute(
      new SubmitPerfumeCommand({
        payload: { name: 'X' },
      }),
    );

    expect(result).toEqual({ submissionId: 'sub-9', status: 'QUEUED' });
  });

  it('throws when payload fails validation', async () => {
    await expect(handler.execute(new SubmitPerfumeCommand({ payload: {} }))).rejects.toThrow();
    expect(prisma.perfumeSubmission.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
