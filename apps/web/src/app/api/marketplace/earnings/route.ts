import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    totalEarned: 2450,
    thisMonth: 380,
    lastMonth: 420,
    pendingPayout: 380,
    nextPayoutDate: "2026-04-01T00:00:00Z",
    currency: "credits",
    items: [
      {
        id: "item_pub_001",
        name: "Stylized Tree Generator",
        revenue: 1680,
        downloads: 312,
        refunds: 2,
        netRevenue: 1650,
      },
      {
        id: "item_pub_002",
        name: "Cloud Skybox Collection",
        revenue: 520,
        downloads: 104,
        refunds: 0,
        netRevenue: 520,
      },
      {
        id: "item_pub_003",
        name: "Particle Trail Effects",
        revenue: 250,
        downloads: 50,
        refunds: 1,
        netRevenue: 240,
      },
    ],
    monthlyBreakdown: [
      { month: "2026-01", earned: 310 },
      { month: "2026-02", earned: 420 },
      { month: "2026-03", earned: 380 },
    ],
  });
}
