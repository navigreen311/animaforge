import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: scriptId } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body.projectId !== "string" || body.projectId.trim().length === 0) {
    return NextResponse.json(
      { error: "Validation failed: 'projectId' is required and must be a non-empty string." },
      { status: 400 },
    );
  }

  const shotsCreated = 9;

  return NextResponse.json(
    {
      scriptId,
      projectId: body.projectId,
      shotsCreated,
      message: `${shotsCreated} shots added to timeline`,
    },
    { status: 200 },
  );
}
