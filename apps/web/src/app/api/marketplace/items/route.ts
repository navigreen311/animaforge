import { NextRequest, NextResponse } from "next/server";

const MOCK_ITEMS = [
  {
    id: "item_001",
    name: "Cyberpunk City Environment",
    type: "environment",
    creator: { id: "creator_001", name: "NeonArtist", avatar: "/avatars/neon.png" },
    price: 1200,
    currency: "credits",
    rating: 4.8,
    reviewCount: 124,
    license: "standard",
    tags: ["cyberpunk", "city", "neon", "sci-fi", "environment"],
    downloads: 3420,
    thumbnail: "/marketplace/cyberpunk-city.jpg",
    description: "A fully detailed cyberpunk cityscape with neon lighting, rain effects, and animated billboards.",
    createdAt: "2025-11-15T10:00:00Z",
    updatedAt: "2026-02-20T14:30:00Z",
  },
  {
    id: "item_002",
    name: "Fantasy Dragon Rig",
    type: "character",
    creator: { id: "creator_002", name: "DragonForge", avatar: "/avatars/dragon.png" },
    price: 2500,
    currency: "credits",
    rating: 4.9,
    reviewCount: 89,
    license: "extended",
    tags: ["dragon", "fantasy", "rigged", "character", "animation"],
    downloads: 1870,
    thumbnail: "/marketplace/dragon-rig.jpg",
    description: "Production-ready dragon character with full IK/FK rig, blend shapes, and 12 animation presets.",
    createdAt: "2025-09-03T08:00:00Z",
    updatedAt: "2026-01-10T09:15:00Z",
  },
  {
    id: "item_003",
    name: "Anime Shader Pack",
    type: "shader",
    creator: { id: "creator_003", name: "ToonMaster", avatar: "/avatars/toon.png" },
    price: 800,
    currency: "credits",
    rating: 4.6,
    reviewCount: 256,
    license: "standard",
    tags: ["anime", "toon", "shader", "cel-shading", "stylized"],
    downloads: 8910,
    thumbnail: "/marketplace/anime-shaders.jpg",
    description: "20+ anime-style shaders with outline control, halftone shadows, and gradient ramp support.",
    createdAt: "2025-07-22T12:00:00Z",
    updatedAt: "2026-03-01T16:45:00Z",
  },
  {
    id: "item_004",
    name: "Realistic Water FX",
    type: "effect",
    creator: { id: "creator_001", name: "NeonArtist", avatar: "/avatars/neon.png" },
    price: 950,
    currency: "credits",
    rating: 4.7,
    reviewCount: 67,
    license: "standard",
    tags: ["water", "realistic", "vfx", "particles", "ocean"],
    downloads: 2140,
    thumbnail: "/marketplace/water-fx.jpg",
    description: "Physically-based water simulation effects including ocean, river, rain splash, and underwater caustics.",
    createdAt: "2025-12-08T14:00:00Z",
    updatedAt: "2026-02-28T11:20:00Z",
  },
  {
    id: "item_005",
    name: "Medieval Weapon Set",
    type: "prop",
    creator: { id: "creator_004", name: "ForgeSmith", avatar: "/avatars/forge.png" },
    price: 600,
    currency: "credits",
    rating: 4.5,
    reviewCount: 198,
    license: "standard",
    tags: ["medieval", "weapons", "sword", "props", "fantasy"],
    downloads: 5630,
    thumbnail: "/marketplace/medieval-weapons.jpg",
    description: "30 hand-crafted medieval weapons with PBR textures at 4K resolution. Swords, axes, maces, and shields.",
    createdAt: "2025-06-14T09:00:00Z",
    updatedAt: "2026-01-25T13:00:00Z",
  },
  {
    id: "item_006",
    name: "Motion Capture Dance Pack",
    type: "animation",
    creator: { id: "creator_005", name: "MoCapPro", avatar: "/avatars/mocap.png" },
    price: 1800,
    currency: "credits",
    rating: 4.4,
    reviewCount: 42,
    license: "extended",
    tags: ["mocap", "dance", "animation", "motion-capture", "movement"],
    downloads: 980,
    thumbnail: "/marketplace/dance-pack.jpg",
    description: "50 professionally captured dance animations. Hip-hop, contemporary, ballet, and breakdance styles.",
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-03-15T08:30:00Z",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "popular";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  let filtered = [...MOCK_ITEMS];

  if (type && type !== "all") {
    filtered = filtered.filter((item) => item.type === type);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.includes(q)) ||
        item.description.toLowerCase().includes(q),
    );
  }

  switch (sort) {
    case "newest":
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "price-low":
      filtered.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      filtered.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case "popular":
    default:
      filtered.sort((a, b) => b.downloads - a.downloads);
      break;
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    items: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, type, price, license, tags, description } = body;

  if (!name || !type || price == null) {
    return NextResponse.json(
      { error: "Missing required fields: name, type, price" },
      { status: 400 },
    );
  }

  const newItem = {
    id: `item_${Date.now()}`,
    name,
    type,
    creator: { id: "creator_self", name: "CurrentUser", avatar: "/avatars/default.png" },
    price,
    currency: "credits",
    rating: 0,
    reviewCount: 0,
    license: license ?? "standard",
    tags: tags ?? [],
    downloads: 0,
    thumbnail: "/marketplace/placeholder.jpg",
    description: description ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(newItem, { status: 201 });
}
