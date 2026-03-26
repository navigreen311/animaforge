import { NextRequest, NextResponse } from "next/server";

const MOCK_LIBRARY = [
  {
    id: "lib_001",
    itemId: "item_001",
    name: "Cyberpunk City Environment",
    type: "environment",
    creator: { id: "creator_001", name: "NeonArtist" },
    thumbnail: "/marketplace/cyberpunk-city.jpg",
    license: "standard",
    badge: "Owned",
    purchasedAt: "2026-01-10T12:00:00Z",
    downloadUrl: "/api/marketplace/download/item_001",
    version: "2.1.0",
    updateAvailable: true,
    latestVersion: "2.2.0",
  },
  {
    id: "lib_002",
    itemId: "item_003",
    name: "Anime Shader Pack",
    type: "shader",
    creator: { id: "creator_003", name: "ToonMaster" },
    thumbnail: "/marketplace/anime-shaders.jpg",
    license: "standard",
    badge: "Owned",
    purchasedAt: "2026-02-05T16:30:00Z",
    downloadUrl: "/api/marketplace/download/item_003",
    version: "3.0.1",
    updateAvailable: false,
    latestVersion: "3.0.1",
  },
];

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    items: MOCK_LIBRARY,
    total: MOCK_LIBRARY.length,
  });
}
