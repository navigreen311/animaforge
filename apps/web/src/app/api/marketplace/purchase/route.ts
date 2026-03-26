import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { itemId, licenseType } = body;

  if (!itemId) {
    return NextResponse.json(
      { error: "itemId is required" },
      { status: 400 },
    );
  }

  if (licenseType && !["standard", "extended"].includes(licenseType)) {
    return NextResponse.json(
      { error: "licenseType must be 'standard' or 'extended'" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    purchaseId: `pur_${Date.now()}`,
    itemId,
    licenseType: licenseType ?? "standard",
    newBalance: 4150,
    libraryItemId: `lib_${Date.now()}`,
    purchasedAt: new Date().toISOString(),
  });
}
