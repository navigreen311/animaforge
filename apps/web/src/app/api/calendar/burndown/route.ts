import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const projectId = searchParams.get('projectId') ?? 'proj_1';
  const totalTasks = 40;
  const days = 14;
  const points = Array.from({ length: days }, (_, i) => {
    const ideal = Math.max(0, totalTasks - (totalTasks / (days - 1)) * i);
    const actual = Math.max(
      0,
      totalTasks - Math.round((totalTasks / (days - 1)) * i * (0.85 + Math.random() * 0.3)),
    );
    return {
      date: new Date(Date.now() - (days - 1 - i) * 86400_000)
        .toISOString()
        .slice(0, 10),
      ideal: Math.round(ideal),
      actual,
    };
  });
  return NextResponse.json({
    projectId,
    totalTasks,
    completedTasks: totalTasks - points[points.length - 1].actual,
    points,
  });
}
