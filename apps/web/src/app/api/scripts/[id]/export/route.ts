import { NextRequest, NextResponse } from "next/server";

const MOCK_SCRIPT_DATA = {
  title: "Neon Requiem",
  author: "AnimaForge AI",
  scenes: [
    {
      heading: "EXT. NEO-TOKYO ROOFTOP - NIGHT",
      action:
        "Rain hammers the rooftop. Neon signs flicker across the skyline. KAI stands at the edge, coat whipping in the wind.",
      dialogue: [
        { character: "KAI", parenthetical: "(into comms)", line: "I'm at the extraction point. No sign of the target." },
      ],
    },
    {
      heading: "INT. UNDERGROUND LAB - NIGHT",
      action:
        "Banks of holographic monitors cast blue light. DR. YUKI works feverishly at a console, surrounded by cables and prototype limbs.",
      dialogue: [
        { character: "DR. YUKI", parenthetical: "(without looking up)", line: "You're late. The neural bridge is destabilizing." },
        { character: "KAI", parenthetical: null, line: "Then we don't have much time." },
      ],
    },
    {
      heading: "EXT. GARDEN RUINS - DAWN",
      action:
        "Overgrown stone columns frame a crumbling greenhouse. Mist clings to wild ivy. LENA kneels among bioluminescent flowers, whispering to them.",
      dialogue: [
        { character: "LENA", parenthetical: "(softly)", line: "They remember everything. Every voice. Every footstep." },
      ],
    },
  ],
};

function generateFountain(): string {
  const lines: string[] = [];

  lines.push(`Title: ${MOCK_SCRIPT_DATA.title}`);
  lines.push(`Credit: Written by`);
  lines.push(`Author: ${MOCK_SCRIPT_DATA.author}`);
  lines.push(`Draft date: ${new Date().toISOString().split("T")[0]}`);
  lines.push("");
  lines.push("===");
  lines.push("");

  for (const scene of MOCK_SCRIPT_DATA.scenes) {
    // Scene heading (must be uppercase, starting with INT./EXT.)
    lines.push(scene.heading);
    lines.push("");

    // Action block
    lines.push(scene.action);
    lines.push("");

    // Dialogue blocks
    for (const d of scene.dialogue) {
      lines.push(d.character.toUpperCase());
      if (d.parenthetical) {
        lines.push(d.parenthetical);
      }
      lines.push(d.line);
      lines.push("");
    }
  }

  lines.push("FADE OUT.");
  lines.push("");

  return lines.join("\n");
}

function generateFdxJson() {
  return {
    format: "fdx",
    version: "1.0",
    title: MOCK_SCRIPT_DATA.title,
    author: MOCK_SCRIPT_DATA.author,
    scenes: MOCK_SCRIPT_DATA.scenes.map((scene, i) => ({
      id: `scene-${i + 1}`,
      heading: scene.heading,
      action: scene.action,
      dialogue: scene.dialogue.map((d) => ({
        character: d.character,
        parenthetical: d.parenthetical,
        line: d.line,
      })),
    })),
  };
}

function generatePdfJson() {
  return {
    format: "pdf",
    note: "PDF generation requires a server-side rendering pipeline. Returning structured data for client-side PDF generation.",
    title: MOCK_SCRIPT_DATA.title,
    author: MOCK_SCRIPT_DATA.author,
    pages: MOCK_SCRIPT_DATA.scenes.map((scene, i) => ({
      page: i + 1,
      heading: scene.heading,
      action: scene.action,
      dialogue: scene.dialogue,
    })),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: scriptId } = await params;
  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format") ?? "fountain";

  const validFormats = ["pdf", "fountain", "fdx"];
  if (!validFormats.includes(format)) {
    return NextResponse.json(
      { error: `Invalid format '${format}'. Must be one of: ${validFormats.join(", ")}` },
      { status: 400 },
    );
  }

  if (format === "fountain") {
    const fountainText = generateFountain();
    return new NextResponse(fountainText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scriptId}.fountain"`,
      },
    });
  }

  if (format === "fdx") {
    const fdxData = generateFdxJson();
    return NextResponse.json(fdxData, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${scriptId}.fdx.json"`,
      },
    });
  }

  // format === "pdf"
  const pdfData = generatePdfJson();
  return NextResponse.json(pdfData, {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="${scriptId}.pdf.json"`,
    },
  });
}
