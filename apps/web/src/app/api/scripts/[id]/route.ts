import { NextRequest, NextResponse } from "next/server";

const MOCK_SCRIPT = {
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
        "Banks of holographic monitors cast blue light. DR. YUKI works feverishly at a console.",
      shots: [
        {
          id: "shot-003",
          type: "tracking",
          description: "Camera glides through rows of equipment toward Yuki.",
          duration: 5,
        },
      ],
    },
  ],
  characters: [
    { id: "char-001", name: "Kai", role: "protagonist" },
    { id: "char-002", name: "Dr. Yuki", role: "supporting" },
  ],
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return NextResponse.json(
    { ...MOCK_SCRIPT, id },
    { status: 200 },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a valid JSON object." },
      { status: 400 },
    );
  }

  const updatedScript = {
    ...MOCK_SCRIPT,
    ...body,
    id, // id cannot be overridden
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(updatedScript, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return NextResponse.json(
    { success: true, deletedId: id },
    { status: 200 },
  );
}
