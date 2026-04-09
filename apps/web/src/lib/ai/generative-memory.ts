/**
 * G8 Generative Memory — learns from user approval patterns to suggest
 * camera, duration, motion style, and prompt keywords for future shots.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GenerativeMemory {
  cameraPreferences: Record<string, number>;
  styleHistory: Array<{ styleId: string; approved: boolean; timestamp: string }>;
  approvedPromptKeywords: string[];
  averageDuration: number;
  preferredMotionStyles: Record<string, number>;
}

export interface MemorySuggestions {
  suggestedCamera: Array<{ type: string; percentage: number }>;
  suggestedDuration: { min: number; max: number; avg: number };
  suggestedMotion: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_STYLE_HISTORY = 20;
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'because', 'if', 'when', 'while', 'this', 'that',
  'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'me', 'my',
]);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractKeywords(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function topEntries(record: Record<string, number>, limit = 5) {
  return Object.entries(record)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Core functions                                                     */
/* ------------------------------------------------------------------ */

export function createEmptyMemory(): GenerativeMemory {
  return {
    cameraPreferences: {},
    styleHistory: [],
    approvedPromptKeywords: [],
    averageDuration: 0,
    preferredMotionStyles: {},
  };
}

export function updateGenerativeMemory(
  currentMemory: GenerativeMemory,
  approvedShot: {
    sceneGraph?: { camera?: { angle?: string; movement?: string }; timing?: { duration_ms?: number } };
    prompt?: string;
    styleRef?: string;
    durationMs?: number;
  },
): GenerativeMemory {
  const mem = structuredClone(currentMemory);

  // Update camera preferences count
  const cameraAngle = approvedShot.sceneGraph?.camera?.angle;
  if (cameraAngle) {
    mem.cameraPreferences[cameraAngle] = (mem.cameraPreferences[cameraAngle] ?? 0) + 1;
  }

  // Push to style history (keep last 20)
  if (approvedShot.styleRef) {
    mem.styleHistory.push({
      styleId: approvedShot.styleRef,
      approved: true,
      timestamp: new Date().toISOString(),
    });
    if (mem.styleHistory.length > MAX_STYLE_HISTORY) {
      mem.styleHistory = mem.styleHistory.slice(-MAX_STYLE_HISTORY);
    }
  }

  // Extract and store keywords from approved prompt
  if (approvedShot.prompt) {
    const keywords = extractKeywords(approvedShot.prompt);
    const existingSet = new Set(mem.approvedPromptKeywords);
    for (const kw of keywords) {
      existingSet.add(kw);
    }
    mem.approvedPromptKeywords = Array.from(existingSet).slice(-200);
  }

  // Update average duration (running average)
  const duration = approvedShot.durationMs ?? approvedShot.sceneGraph?.timing?.duration_ms;
  if (duration && duration > 0) {
    const totalApprovals = Object.values(mem.cameraPreferences).reduce((s, v) => s + v, 0);
    mem.averageDuration =
      totalApprovals > 1
        ? mem.averageDuration + (duration - mem.averageDuration) / totalApprovals
        : duration;
  }

  // Update motion style preferences
  const movement = approvedShot.sceneGraph?.camera?.movement;
  if (movement) {
    mem.preferredMotionStyles[movement] = (mem.preferredMotionStyles[movement] ?? 0) + 1;
  }

  return mem;
}

export function buildMemoryContext(memory: GenerativeMemory): string {
  const parts: string[] = [];

  // Camera preferences
  const totalCamera = Object.values(memory.cameraPreferences).reduce((s, v) => s + v, 0);
  if (totalCamera > 0) {
    const cameraStr = topEntries(memory.cameraPreferences, 3)
      .map(([type, count]) => `${type} (${Math.round((count / totalCamera) * 100)}%)`)
      .join(', ');
    parts.push(`User prefers ${cameraStr}.`);
  }

  // Duration
  if (memory.averageDuration > 0) {
    const avgSec = memory.averageDuration / 1000;
    const minSec = Math.max(1, Math.floor(avgSec * 0.7));
    const maxSec = Math.ceil(avgSec * 1.3);
    parts.push(`Average duration: ${minSec}-${maxSec}s.`);
  }

  // Motion
  const totalMotion = Object.values(memory.preferredMotionStyles).reduce((s, v) => s + v, 0);
  if (totalMotion > 0) {
    const motionStr = topEntries(memory.preferredMotionStyles, 3)
      .map(([style, count]) => `${style} (${Math.round((count / totalMotion) * 100)}%)`)
      .join(', ');
    parts.push(`Preferred motion: ${motionStr}.`);
  }

  // Keywords
  if (memory.approvedPromptKeywords.length > 0) {
    const recent = memory.approvedPromptKeywords.slice(-10);
    parts.push(`Recurring themes: ${recent.join(', ')}.`);
  }

  return parts.join(' ');
}

export function getMemorySuggestions(memory: GenerativeMemory): MemorySuggestions {
  // Camera suggestions
  const totalCamera = Object.values(memory.cameraPreferences).reduce((s, v) => s + v, 0);
  const suggestedCamera =
    totalCamera > 0
      ? topEntries(memory.cameraPreferences, 5).map(([type, count]) => ({
          type,
          percentage: Math.round((count / totalCamera) * 100),
        }))
      : [];

  // Duration suggestions
  const avgMs = memory.averageDuration || 4000;
  const avgSec = avgMs / 1000;
  const suggestedDuration = {
    min: Math.max(1, Math.round(avgSec * 0.7 * 10) / 10),
    max: Math.round(avgSec * 1.3 * 10) / 10,
    avg: Math.round(avgSec * 10) / 10,
  };

  // Motion suggestion (top pick)
  const motionEntries = topEntries(memory.preferredMotionStyles, 1);
  const suggestedMotion = motionEntries.length > 0 ? motionEntries[0][0] : 'static';

  return { suggestedCamera, suggestedDuration, suggestedMotion };
}
