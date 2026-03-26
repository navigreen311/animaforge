import { NextRequest, NextResponse } from "next/server";

const MOCK_PUBLISHED = [
  {
    id: "item_pub_001",
    name: "Stylized Tree Generator",
    type: "tool",
    price: 1500,
    currency: "credits",
    license: "standard",
    thumbnail: "/marketplace/tree-generator.jpg",
    description: "Procedural stylized tree generator with 50+ presets for various art styles.",
    tags: ["procedural", "trees", "stylized", "generator", "nature"],
    status: "published",
    stats: {
      views: 4820,
      downloads: 312,
      revenue: 468000,
      rating: 4.7,
      reviewCount: 38,
      wishlistCount: 145,
      conversionRate: 6.5,
    },
    publishedAt: "2025-10-01T08:00:00Z",
    updatedAt: "2026-03-10T12:00:00Z",
  },
];

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    items: MOCK_PUBLISHED,
    total: MOCK_PUBLISHED.length,
  });
}
