import { NextRequest, NextResponse } from "next/server";

const MOCK_ITEM = {
  id: "item_001",
  name: "Cyberpunk City Environment",
  type: "environment",
  creator: {
    id: "creator_001",
    name: "NeonArtist",
    avatar: "/avatars/neon.png",
    totalItems: 12,
    totalSales: 5200,
    joinedAt: "2024-03-10T00:00:00Z",
  },
  price: 1200,
  currency: "credits",
  rating: 4.8,
  reviewCount: 124,
  license: "standard",
  tags: ["cyberpunk", "city", "neon", "sci-fi", "environment"],
  downloads: 3420,
  thumbnail: "/marketplace/cyberpunk-city.jpg",
  images: [
    "/marketplace/cyberpunk-city-1.jpg",
    "/marketplace/cyberpunk-city-2.jpg",
    "/marketplace/cyberpunk-city-3.jpg",
  ],
  description:
    "A fully detailed cyberpunk cityscape with neon lighting, rain effects, and animated billboards. Includes 15 modular building blocks, 30+ props, and dynamic time-of-day lighting presets.",
  features: [
    "15 modular building blocks",
    "30+ street-level props",
    "Dynamic time-of-day presets",
    "Rain particle system included",
    "Optimized for real-time rendering",
  ],
  fileSize: "245 MB",
  format: "FBX, OBJ, GLTF",
  compatibility: ["AnimaForge 2.0+", "Blender 3.6+", "Unity 2022+"],
  reviews: [
    {
      id: "rev_001",
      userId: "user_101",
      userName: "StudioAlpha",
      userAvatar: "/avatars/studio-alpha.png",
      rating: 5,
      text: "Incredible detail and the modular system makes it so easy to customize. Lighting presets saved me hours of work.",
      createdAt: "2026-02-15T09:00:00Z",
    },
    {
      id: "rev_002",
      userId: "user_102",
      userName: "PixelDreamer",
      userAvatar: "/avatars/pixel.png",
      rating: 4,
      text: "Great environment pack. Only minor issue is some UV seams on the larger buildings, but overall excellent quality.",
      createdAt: "2026-01-28T14:30:00Z",
    },
    {
      id: "rev_003",
      userId: "user_103",
      userName: "AnimeProd",
      userAvatar: "/avatars/anime-prod.png",
      rating: 5,
      text: "Perfect for our cyberpunk anime project. The neon signs are gorgeous and the rain system is top notch.",
      createdAt: "2026-03-05T11:15:00Z",
    },
  ],
  createdAt: "2025-11-15T10:00:00Z",
  updatedAt: "2026-02-20T14:30:00Z",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  // In production, look up by id. For mock, return the item with the requested id.
  return NextResponse.json({
    ...MOCK_ITEM,
    id,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await request.json();

  const allowedFields = ["name", "price", "description", "tags", "license"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided for update" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ...MOCK_ITEM,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  return NextResponse.json({
    success: true,
    message: `Item ${id} has been deleted`,
    deletedAt: new Date().toISOString(),
  });
}
