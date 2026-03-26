import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Validation failed: 'prompt' is required and must be a non-empty string." },
      { status: 400 },
    );
  }

  const { prompt, format, tone, targetDuration, targetShotCount } = body;

  const scriptId = `script-gen-${Date.now()}`;
  const title = `Generated: ${prompt.slice(0, 60)}${prompt.length > 60 ? "..." : ""}`;

  const scenes = [
    {
      id: "gen-scene-001",
      order: 1,
      heading: "EXT. NEO-TOKYO ROOFTOP - NIGHT",
      description:
        "The city sprawls below, a maze of neon and steel. Rain lashes the rooftop as KAI emerges from a service door, scanning for pursuers. Holographic billboards flicker against the clouds.",
      tone: tone ?? "dramatic",
      shots: [
        {
          id: "gen-shot-001",
          type: "wide",
          description: "Sweeping establishing shot of the rain-soaked rooftop against a neon skyline.",
          duration: 5,
          cameraMovement: "crane-down",
        },
        {
          id: "gen-shot-002",
          type: "medium",
          description: "Kai pushes through the service door, weapon drawn, eyes alert.",
          duration: 3,
          cameraMovement: "static",
        },
        {
          id: "gen-shot-003",
          type: "close-up",
          description: "Kai's hand trembles as he lowers the weapon, realizing the rooftop is empty.",
          duration: 4,
          cameraMovement: "slow-push",
        },
      ],
    },
    {
      id: "gen-scene-002",
      order: 2,
      heading: "INT. UNDERGROUND LAB - NIGHT",
      description:
        "Rows of tanks filled with luminous fluid line the walls. DR. YUKI hunches over a holographic workstation, assembling a neural bridge. ZERO, a rogue AI construct, materializes on a nearby screen.",
      tone: tone ?? "dramatic",
      shots: [
        {
          id: "gen-shot-004",
          type: "tracking",
          description: "Camera glides past glowing tanks, revealing Yuki deep in the lab.",
          duration: 6,
          cameraMovement: "dolly-forward",
        },
        {
          id: "gen-shot-005",
          type: "over-the-shoulder",
          description: "Yuki manipulates holographic schematics; Zero's face flickers on screen behind her.",
          duration: 4,
          cameraMovement: "static",
        },
        {
          id: "gen-shot-006",
          type: "insert",
          description: "Extreme close-up of the neural bridge chip sparking to life.",
          duration: 2,
          cameraMovement: "rack-focus",
        },
      ],
    },
    {
      id: "gen-scene-003",
      order: 3,
      heading: "EXT. GARDEN RUINS - DAWN",
      description:
        "Ancient stone arches draped in bioluminescent vines. A shallow pool reflects the first light. KAI and YUKI meet at the pool's edge, the neural bridge between them. LENA watches from the tree line.",
      tone: tone ?? "dramatic",
      shots: [
        {
          id: "gen-shot-007",
          type: "aerial",
          description: "Drone descends through morning mist, revealing the crumbling garden from above.",
          duration: 7,
          cameraMovement: "crane-down",
        },
        {
          id: "gen-shot-008",
          type: "two-shot",
          description: "Kai and Yuki face each other at the pool, the bridge glowing between their hands.",
          duration: 5,
          cameraMovement: "slow-orbit",
        },
        {
          id: "gen-shot-009",
          type: "long",
          description: "Lena steps from the trees as light breaks over the ruins. Hold wide as the three converge.",
          duration: 6,
          cameraMovement: "static",
        },
      ],
    },
  ];

  const shotBreakdown = {
    totalShots: 9,
    totalDuration: scenes.reduce(
      (sum, scene) => sum + scene.shots.reduce((s, shot) => s + shot.duration, 0),
      0,
    ),
    byType: {
      wide: 1,
      medium: 1,
      "close-up": 1,
      tracking: 1,
      "over-the-shoulder": 1,
      insert: 1,
      aerial: 1,
      "two-shot": 1,
      long: 1,
    },
    targetDuration: targetDuration ?? null,
    targetShotCount: targetShotCount ?? null,
  };

  const detectedCharacters = [
    {
      id: "det-char-001",
      name: "Kai",
      role: "protagonist",
      appearancesInScenes: ["gen-scene-001", "gen-scene-003"],
      description: "A battle-worn operative haunted by a mission gone wrong.",
    },
    {
      id: "det-char-002",
      name: "Dr. Yuki",
      role: "supporting",
      appearancesInScenes: ["gen-scene-002", "gen-scene-003"],
      description: "A brilliant but reclusive neural engineer building forbidden technology.",
    },
    {
      id: "det-char-003",
      name: "Lena",
      role: "supporting",
      appearancesInScenes: ["gen-scene-003"],
      description: "A mysterious guardian of the garden ruins with ties to the old world.",
    },
  ];

  return NextResponse.json(
    {
      scriptId,
      title,
      format: format ?? "screenplay",
      tone: tone ?? "dramatic",
      scenes,
      shotBreakdown,
      detectedCharacters,
    },
    { status: 200 },
  );
}
