import { NextRequest, NextResponse } from "next/server";

const MOCK_CREATOR = {
  id: "creator_001",
  name: "NeonArtist",
  avatar: "/avatars/neon.png",
  banner: "/banners/neon-banner.jpg",
  bio: "Professional 3D environment artist specializing in sci-fi and cyberpunk aesthetics. 10+ years in game development.",
  location: "Tokyo, Japan",
  website: "https://neonartist.example.com",
  joinedAt: "2024-03-10T00:00:00Z",
  verified: true,
  stats: {
    totalItems: 12,
    totalSales: 5200,
    totalRevenue: 3840000,
    averageRating: 4.75,
    followers: 1820,
  },
  items: [
    {
      id: "item_001",
      name: "Cyberpunk City Environment",
      type: "environment",
      price: 1200,
      rating: 4.8,
      reviewCount: 124,
      downloads: 3420,
      thumbnail: "/marketplace/cyberpunk-city.jpg",
    },
    {
      id: "item_004",
      name: "Realistic Water FX",
      type: "effect",
      price: 950,
      rating: 4.7,
      reviewCount: 67,
      downloads: 2140,
      thumbnail: "/marketplace/water-fx.jpg",
    },
    {
      id: "item_007",
      name: "Neon Sign Generator",
      type: "tool",
      price: 700,
      rating: 4.6,
      reviewCount: 45,
      downloads: 1560,
      thumbnail: "/marketplace/neon-signs.jpg",
    },
  ],
  badges: ["Top Seller", "Verified Creator", "Community Favorite"],
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  return NextResponse.json({
    ...MOCK_CREATOR,
    id,
  });
}
