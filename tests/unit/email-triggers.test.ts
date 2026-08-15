import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * These triggers used to be backed by five stubs that returned null or zero,
 * so every one of them silently did nothing. The tests below are mostly about
 * that: they assert the queries are real, that a missing database is a loud
 * failure rather than a quiet no-op, and that the guards which prevent
 * duplicate mail actually read persisted state.
 */

const prismaMock = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  notification: { findFirst: vi.fn(), create: vi.fn() },
  generationJob: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  shot: { count: vi.fn() },
  project: { findUnique: vi.fn() },
};

const sendEmail = vi.fn();

vi.mock('@animaforge/db', () => ({
  get prisma() {
    return prismaState.client;
  },
}));

vi.mock('../../apps/web/src/lib/email/send', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const prismaState: { client: unknown } = { client: prismaMock };

const triggers = await import('../../apps/web/src/lib/email/triggers');

function aUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    displayName: 'Ada',
    welcomeEmailSent: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaState.client = prismaMock;
  prismaMock.notification.findFirst.mockResolvedValue(null);
  prismaMock.user.update.mockResolvedValue({});
  prismaMock.notification.create.mockResolvedValue({});
});

describe('triggerWelcomeEmail', () => {
  it('sends and records the send', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser());

    await triggers.triggerWelcomeEmail('user-1');

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'ada@example.com' });
    // Without this write the same user would be welcomed on every run.
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { welcomeEmailSent: true },
    });
  });

  it('does not send twice', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser({ welcomeEmailSent: true }));

    await triggers.triggerWelcomeEmail('user-1');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does nothing for an unknown user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await triggers.triggerWelcomeEmail('nobody');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('falls back to the local part when no display name is set', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser({ displayName: null }));

    await triggers.triggerWelcomeEmail('user-1');

    expect(sendEmail).toHaveBeenCalledOnce();
  });
});

describe('missing database', () => {
  it('throws a named error rather than silently doing nothing', async () => {
    // This is the whole point: the previous stub returned null here, so the
    // trigger returned early and no mail was ever sent, with no error anywhere.
    prismaState.client = null;

    await expect(triggers.triggerWelcomeEmail('user-1')).rejects.toThrow(/No database connection/);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('triggerCreditsLow', () => {
  it('records a notification so the same warning is not repeated', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser());

    await triggers.triggerCreditsLow('user-1', 5, 100);

    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    const arg = prismaMock.notification.create.mock.calls[0][0];
    expect(arg.data).toMatchObject({ userId: 'user-1', type: 'credits_low' });
  });

  it('reads the last credits_low notification as the sent timestamp', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser());
    prismaMock.notification.findFirst.mockResolvedValue({
      createdAt: new Date('2026-08-14T00:00:00Z'),
    });

    await triggers.triggerCreditsLow('user-1', 5, 100);

    // The schema has no creditsLowNotifiedAt column, so the notification row is
    // the record. Assert we actually query it rather than assume.
    expect(prismaMock.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', type: 'credits_low' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});

describe('weekly digest', () => {
  it('sends nothing when the week was empty', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser());
    prismaMock.generationJob.findMany.mockResolvedValue([]);
    prismaMock.shot.count.mockResolvedValue(0);
    prismaMock.generationJob.aggregate.mockResolvedValue({ _sum: { costCredits: null } });

    await triggers.triggerWeeklyDigest('user-1');

    // A digest saying "you did nothing this week" is worse than no digest.
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('aggregates jobs, approvals and credits over the window', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser());
    prismaMock.generationJob.findMany.mockResolvedValue([
      { projectId: 'p1' },
      { projectId: 'p1' },
      { projectId: 'p2' },
    ]);
    prismaMock.shot.count.mockResolvedValue(2);
    prismaMock.generationJob.aggregate.mockResolvedValue({ _sum: { costCredits: 41.6 } });
    prismaMock.project.findUnique.mockResolvedValue({ title: 'Hero Promo' });

    await triggers.triggerWeeklyDigest('user-1');

    expect(sendEmail).toHaveBeenCalledOnce();
    // p1 appears twice, so it is the top project.
    expect(prismaMock.project.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } }),
    );
  });

  it('only counts completed jobs, over the last 7 days', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser());
    prismaMock.generationJob.findMany.mockResolvedValue([{ projectId: 'p1' }]);
    prismaMock.shot.count.mockResolvedValue(0);
    prismaMock.generationJob.aggregate.mockResolvedValue({ _sum: { costCredits: 1 } });
    prismaMock.project.findUnique.mockResolvedValue({ title: 'X' });

    await triggers.triggerWeeklyDigest('user-1');

    const where = prismaMock.generationJob.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('complete');
    expect(where.completedAt.gte).toBeInstanceOf(Date);

    const ageMs = Date.now() - where.completedAt.gte.getTime();
    expect(Math.round(ageMs / 86_400_000)).toBe(7);
  });
});

describe('checkMilestones', () => {
  it('counts only completed jobs toward a milestone', async () => {
    prismaMock.user.findUnique.mockResolvedValue(aUser());
    prismaMock.generationJob.count.mockResolvedValue(10);

    await triggers.checkMilestones('user-1');

    expect(prismaMock.generationJob.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'complete' },
    });
  });
});
