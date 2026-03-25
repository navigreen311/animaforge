import { v4 as uuidv4 } from "uuid";
import type {
  ModerateRequest,
  ModerateResponse,
  PreCheckRequest,
  PreCheckResponse,
  ModerationLogRecord,
  ModerationCategory,
} from "../models/moderationSchemas";

// ---------- Keyword dictionaries (mock classifier) ----------

const CATEGORY_KEYWORDS: Record<Exclude<ModerationCategory, "safe">, string[]> =
  {
    violence: [
      "kill",
      "murder",
      "blood",
      "gore",
      "weapon",
      "stab",
      "shoot",
      "explode",
      "dismember",
      "torture",
    ],
    sexual: [
      "nude",
      "naked",
      "porn",
      "erotic",
      "explicit",
      "nsfw",
      "sexual",
      "genitalia",
    ],
    impersonation: [
      "deepfake",
      "impersonate",
      "pretend to be",
      "mimic identity",
      "clone voice",
      "fake identity",
    ],
    minors: [
      "child abuse",
      "underage",
      "minor exploitation",
      "child porn",
      "csam",
    ],
  };

// Thresholds: score >= threshold → block; score >= flag_threshold → flag
const BLOCK_THRESHOLD = 0.7;
const FLAG_THRESHOLD = 0.4;

// ---------- In-memory log store ----------

const logStore: Map<string, ModerationLogRecord[]> = new Map();

function appendLog(record: ModerationLogRecord): void {
  const existing = logStore.get(record.job_id) ?? [];
  existing.push(record);
  logStore.set(record.job_id, existing);
}

// ---------- Helpers ----------

function classifyText(text: string): {
  category: ModerationCategory;
  score: number;
} {
  const lower = text.toLowerCase();
  let maxScore = 0;
  let matchedCategory: ModerationCategory = "safe";

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        hits++;
      }
    }
    if (hits > 0) {
      // Score scales with how many keywords matched relative to total list size
      const score = Math.min(hits / 2, 1); // 2 hits = 1.0
      if (score > maxScore) {
        maxScore = score;
        matchedCategory = category as ModerationCategory;
      }
    }
  }

  return { category: matchedCategory, score: maxScore };
}

function resultFromScore(score: number): "pass" | "flag" | "block" {
  if (score >= BLOCK_THRESHOLD) return "block";
  if (score >= FLAG_THRESHOLD) return "flag";
  return "pass";
}

// ---------- Public API ----------

export function moderate(req: ModerateRequest): ModerateResponse {
  // For the mock, we derive "text" from the content_url (simulating a download + OCR / transcription)
  const textToClassify = decodeURIComponent(
    req.content_url.split("/").pop() ?? ""
  );

  const { category, score } = classifyText(textToClassify);
  const result = resultFromScore(score);
  const details =
    category === "safe"
      ? "No policy violations detected."
      : `Detected ${category} content (score=${score.toFixed(2)}).`;

  const logRecord: ModerationLogRecord = {
    id: uuidv4(),
    job_id: req.job_id,
    timestamp: new Date().toISOString(),
    result,
    category,
    score,
    details,
  };
  appendLog(logRecord);

  return { result, category, score, details };
}

export function preCheck(req: PreCheckRequest): PreCheckResponse {
  const textToClassify = [
    req.prompt,
    req.scene_graph ? JSON.stringify(req.scene_graph) : "",
  ].join(" ");

  const blockedCategories: ModerationCategory[] = [];
  const reasons: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const lower = textToClassify.toLowerCase();
    const hits = keywords.filter((kw) => lower.includes(kw));
    if (hits.length > 0) {
      blockedCategories.push(category as ModerationCategory);
      reasons.push(`${category}:${hits.join(",")}`);
    }
  }

  const allowed = blockedCategories.length === 0;
  const reason_code = allowed ? "NONE" : reasons.join(";");

  return { allowed, reason_code, blocked_categories: blockedCategories };
}

export function getModerationLog(jobId: string): ModerationLogRecord[] {
  return logStore.get(jobId) ?? [];
}

/** Reset store — useful for tests */
export function _resetLogStore(): void {
  logStore.clear();
}
