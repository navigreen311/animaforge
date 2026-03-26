import { NextRequest, NextResponse } from "next/server";

const MOCK_WISHLIST = [
  {
    id: "wish_001",
    itemId: "item_002",
    name: "Fantasy Dragon Rig",
    type: "character",
    creator: { id: "creator_002", name: "DragonForge" },
    price: 2500,
    currency: "credits",
    rating: 4.9,
    reviewCount: 89,
    thumbnail: "/marketplace/dragon-rig.jpg",
    addedAt: "2026-02-18T10:00:00Z",
    onSale: false,
  },
  {
    id: "wish_002",
    itemId: "item_006",
    name: "Motion Capture Dance Pack",
    type: "animation",
    creator: { id: "creator_005", name: "MoCapPro" },
    price: 1800,
    currency: "credits",
    rating: 4.4,
    reviewCount: 42,
    thumbnail: "/marketplace/dance-pack.jpg",
    addedAt: "2026-03-12T15:30:00Z",
    onSale: true,
    salePrice: 1440,
  },
];

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    items: MOCK_WISHLIST,
    total: MOCK_WISHLIST.length,
  });
}
