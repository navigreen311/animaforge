// Prompt builder utilities — converts memory & scene graph into AI-ready prompts
// Exports: buildMemoryContext(), buildSceneGraphPrompt(), GenerativeMemory

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GenerativeMemory {
  /** Preferred visual styles the user gravitates toward. */
  preferredStyles: string[];
  /** Color palettes the user has favorited or used frequently. */
  favoriteColorPalettes: string[];
  /** Common themes across the user's projects. */
  recurringThemes: string[];
  /** Camera angles / motion styles used most often. */
  preferredCameraWork: string[];
  /** Pacing preference — how fast cuts tend to be. */
  editingPace: 'fast' | 'moderate' | 'slow';
  /** Free-form notes the user has pinned as creative direction. */
  creativeNotes: string[];
}

/* ------------------------------------------------------------------ */
/*  buildMemoryContext                                                  */
/* ------------------------------------------------------------------ */

/**
 * Converts a user's generative memory into a guidance block that can be
 * prepended to any AI prompt so the model "remembers" the creator's taste.
 */
export function buildMemoryContext(memory: GenerativeMemory): string {
  const lines: string[] = ['[Creator Preferences]'];

  if (memory.preferredStyles.length > 0) {
    lines.push(`Visual style: ${memory.preferredStyles.join(', ')}`);
  }

  if (memory.favoriteColorPalettes.length > 0) {
    lines.push(`Color palettes: ${memory.favoriteColorPalettes.join(', ')}`);
  }

  if (memory.recurringThemes.length > 0) {
    lines.push(`Themes: ${memory.recurringThemes.join(', ')}`);
  }

  if (memory.preferredCameraWork.length > 0) {
    lines.push(`Camera work: ${memory.preferredCameraWork.join(', ')}`);
  }

  lines.push(`Editing pace: ${memory.editingPace}`);

  if (memory.creativeNotes.length > 0) {
    lines.push(`Notes: ${memory.creativeNotes.join('; ')}`);
  }

  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  buildSceneGraphPrompt                                              */
/* ------------------------------------------------------------------ */

/**
 * Converts a scene graph object (from the shot breakdown) into prompt
 * additions that steer the video/image model toward the intended scene.
 */
export function buildSceneGraphPrompt(sceneGraph: {
  prompt?: string;
  characterIds?: string[];
  cameraType?: string;
  motionStyle?: string;
  emotionalBeat?: string;
  styleRef?: string;
}): string {
  const parts: string[] = [];

  if (sceneGraph.prompt) {
    parts.push(sceneGraph.prompt);
  }

  if (sceneGraph.cameraType) {
    parts.push(`Camera: ${sceneGraph.cameraType}`);
  }

  if (sceneGraph.motionStyle) {
    parts.push(`Motion: ${sceneGraph.motionStyle}`);
  }

  if (sceneGraph.emotionalBeat) {
    parts.push(`Emotion: ${sceneGraph.emotionalBeat}`);
  }

  if (sceneGraph.styleRef) {
    parts.push(`Style reference: ${sceneGraph.styleRef}`);
  }

  if (sceneGraph.characterIds && sceneGraph.characterIds.length > 0) {
    parts.push(`Characters in scene: ${sceneGraph.characterIds.length}`);
  }

  return parts.join('. ');
}
