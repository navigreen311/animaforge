import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  return NextResponse.json(
    {
      success: true,
      wishlistItemId: `wish_${Date.now()}`,
      itemId: id,
      addedAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  return NextResponse.json({
    success: true,
    message: `Item ${id} removed from wishlist`,
    removedAt: new Date().toISOString(),
  });
}
