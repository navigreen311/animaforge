import { NextResponse } from 'next/server';

import { MOCK_JOBS } from '@/lib/mockData';

export async function GET() {
  const activeJobs = MOCK_JOBS
    .filter((job) => job.status === 'queued' || job.status === 'running')
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .slice(0, 10)
    .map((job) => {
      if (job.status === 'running') {
        const progressIncrement = Math.floor(Math.random() * 4); // 0-3
        const simulatedProgress = Math.min(job.progress + progressIncrement, 99);
        const simulatedEta = Math.max(
          (job.estimatedSecondsRemaining ?? 0) - 5,
          0,
        );

        return {
          ...job,
          progress: simulatedProgress,
          estimatedSecondsRemaining: simulatedEta,
        };
      }

      return job;
    });

  return NextResponse.json({ jobs: activeJobs, total: activeJobs.length });
}
