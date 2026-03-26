import { NextRequest, NextResponse } from "next/server";

const MOCK_SCRIPTS = [
  {
    id: "script-001",
    title: "Neon Requiem",
    status: "draft",
    format: "screenplay",
    createdAt: "2026-03-20T10:00:00Z",
    updatedAt: "2026-03-22T14:30:00Z",
    scenes: [
      {
        id: "scene-001",
        heading: "EXT. NEO-TOKYO ROOFTOP - NIGHT",
        description:
          "Rain hammers the rooftop. Neon signs flicker across the skyline. KAI stands at the edge, coat whipping in the wind.",
        shots: [
          {
            id: "shot-001",
            type: "wide",
            description: "Establishing shot of the rooftop against the neon skyline.",
            duration: 4,
          },
          {
            id: "shot-002",
            type: "close-up",
            description: "Kai's face, rain streaming down, eyes scanning the city below.",
            duration: 3,
          },
        ],
      },
      {
        id: "scene-002",
        heading: "INT. UNDERGROUND LAB - NIGHT",
        description:
          "Banks of holographic monitors cast blue light. DR. YUKI works feverishly at a console, surrounded by cables and prototype limbs.",
        shots: [
          {
            id: "shot-003",
            type: "tracking",
            description: "Camera glides through rows of equipment toward Yuki.",
            duration: 5,
          },
          {
            id: "shot-004",
            type: "over-the-shoulder",
            description: "Yuki's hands fly across the holographic interface.",
            duration: 3,
          },
        ],
      },
    ],
    characters: [
      { id: "char-001", name: "Kai", role: "protagonist" },
      { id: "char-002", name: "Dr. Yuki", role: "supporting" },
    ],
  },
  {
    id: "script-002",
    title: "The Last Garden",
    status: "published",
    format: "screenplay",
    createdAt: "2026-03-18T08:00:00Z",
    updatedAt: "2026-03-24T09:15:00Z",
    scenes: [
      {
        id: "scene-003",
        heading: "EXT. GARDEN RUINS - DAWN",
        description:
          "Overgrown stone columns frame a crumbling greenhouse. Mist clings to wild ivy. LENA kneels among the flowers, whispering to them.",
        shots: [
          {
            id: "shot-005",
            type: "aerial",
            description: "Drone shot descending through mist into the garden.",
            duration: 6,
          },
          {
            id: "shot-006",
            type: "medium",
            description: "Lena gently touches a bioluminescent bloom.",
            duration: 4,
          },
        ],
      },
      {
        id: "scene-004",
        heading: "INT. GREENHOUSE - CONTINUOUS",
        description:
          "Shattered glass roof lets shafts of dawn light through. A massive tree grows at the center, its roots pulsing with faint light.",
        shots: [
          {
            id: "shot-007",
            type: "low-angle",
            description: "Looking up at the tree canopy through broken glass.",
            duration: 5,
          },
        ],
      },
    ],
    characters: [
      { id: "char-003", name: "Lena", role: "protagonist" },
      { id: "char-004", name: "The Warden", role: "antagonist" },
    ],
  },
];

export async function GET() {
  return NextResponse.json({ scripts: MOCK_SCRIPTS }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json(
      { error: "Validation failed: 'title' is required and must be a non-empty string." },
      { status: 400 },
    );
  }

  const newScript = {
    id: `script-${Date.now()}`,
    title: body.title.trim(),
    status: "draft",
    format: body.format ?? "screenplay",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes: [],
    characters: [],
  };

  return NextResponse.json(newScript, { status: 201 });
}
