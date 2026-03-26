import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await request.json();

  const { rating, text } = body;

  if (rating == null || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating is required and must be a number between 1 and 5" },
      { status: 400 },
    );
  }

  const review = {
    id: `rev_${Date.now()}`,
    itemId: id,
    userId: "user_current",
    userName: "CurrentUser",
    userAvatar: "/avatars/default.png",
    rating: Math.round(rating),
    text: text ?? null,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(review, { status: 201 });
}
