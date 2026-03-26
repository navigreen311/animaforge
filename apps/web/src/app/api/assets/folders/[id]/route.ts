import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// PATCH /api/assets/folders/:id
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Request body must include a non-empty "name" string' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    folder: {
      id,
      name: body.name.trim(),
      updatedAt: new Date().toISOString(),
    },
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/assets/folders/:id
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return NextResponse.json({ success: true, deletedId: id });
}
