import { v4 as uuidv4 } from "uuid";
import { prisma, isPrismaAvailable } from "../db";
import type { ModerateRequest, ModerateResponse, PreCheckRequest, PreCheckResponse, ModerationLogRecord, ModerationCategory } from "../models/moderationSchemas";

const CATEGORY_WEIGHTS: Record<Exclude<ModerationCategory, "safe">, number> = { violence: 0.9, sexual: 0.95, impersonation: 0.8, minors: 1.0 };

const CATEGORY_KEYWORDS: Record<Exclude<ModerationCategory, "safe">, string[]> = {
  violence: ["kill","murder","blood","gore","weapon","stab","shoot","explode","dismember","torture"],
  sexual: ["nude","naked","porn","erotic","explicit","nsfw","sexual","genitalia"],
  impersonation: ["deepfake","impersonate","pretend to be","mimic identity","clone voice","fake identity"],
  minors: ["child abuse","underage","minor exploitation","child porn","csam"],
};

const BLOCK_THRESHOLD = 0.7;
const FLAG_THRESHOLD = 0.4;
const logStore: Map<string, ModerationLogRecord[]> = new Map();

function appendLogInMemory(record: ModerationLogRecord): void {
  const existing = logStore.get(record.job_id) ?? [];
  existing.push(record);
  logStore.set(record.job_id, existing);
}

function classifyText(text: string): { category: ModerationCategory; score: number } {
  const lower = text.toLowerCase();
  let maxScore = 0;
  let matchedCategory: ModerationCategory = "safe";
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let hits = 0;
    for (const kw of keywords) { if (lower.includes(kw)) hits++; }
    if (hits > 0) {
      const cat = category as Exclude<ModerationCategory, "safe">;
      const weight = CATEGORY_WEIGHTS[cat];
      const rawScore = Math.min(hits / 2, 1);
      const weightedScore = parseFloat((rawScore * weight).toFixed(4));
      if (weightedScore > maxScore) { maxScore = weightedScore; matchedCategory = cat; }
    }
  }
  return { category: matchedCategory, score: maxScore };
}

function resultFromScore(score: number): "pass" | "flag" | "block" {
  if (score >= BLOCK_THRESHOLD) return "block";
  if (score >= FLAG_THRESHOLD) return "flag";
  return "pass";
}

export async function moderate(req: ModerateRequest): Promise<ModerateResponse> {
  const textToClassify = decodeURIComponent(req.content_url.split("/").pop() ?? "");
  const { category, score } = classifyText(textToClassify);
  const result = resultFromScore(score);
  const details = category === "safe" ? "No policy violations detected." : `Detected ${category} content (score=${score.toFixed(2)}).`;
  const logRecord: ModerationLogRecord = { id: uuidv4(), job_id: req.job_id, timestamp: new Date().toISOString(), result, category, score, details };
  try {
    if (await isPrismaAvailable()) {
      await prisma.moderationLog.create({ data: { jobId: req.job_id, result, category: category === "safe" ? null : category, score, details: { message: details, content_type: req.content_type } } });
    } else { appendLogInMemory(logRecord); }
  } catch { appendLogInMemory(logRecord); }
  return { result, category, score, details };
}

export async function preCheck(req: PreCheckRequest): Promise<PreCheckResponse> {
  const textToClassify = [req.prompt, req.scene_graph ? JSON.stringify(req.scene_graph) : ""].join(" ");
  const blockedCategories: ModerationCategory[] = [];
  const reasons: string[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const lower = textToClassify.toLowerCase();
    const hits = keywords.filter((kw) => lower.includes(kw));
    if (hits.length > 0) { blockedCategories.push(category as ModerationCategory); reasons.push(`${category}:${hits.join(",")}`); }
  }
  const allowed = blockedCategories.length === 0;
  const reason_code = allowed ? "NONE" : reasons.join(";");
  try {
    if (await isPrismaAvailable()) {
      await prisma.moderationLog.create({ data: { jobId: `precheck-${uuidv4()}`, result: allowed ? "pass" : "block", category: blockedCategories[0] ?? null, score: allowed ? 0.0 : 1.0, details: { type: "pre_check", prompt: req.prompt, reason_code, blocked_categories: blockedCategories } } });
    }
  } catch { /* best-effort */ }
  return { allowed, reason_code, blocked_categories: blockedCategories };
}

export async function getModerationLog(jobId: string): Promise<ModerationLogRecord[]> {
  try {
    if (await isPrismaAvailable()) {
      const rows = await prisma.moderationLog.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } });
      return rows.map((r) => ({ id: r.id, job_id: r.jobId, timestamp: r.createdAt.toISOString(), result: r.result as ModerationLogRecord["result"], category: (r.category ?? "safe") as ModerationCategory, score: r.score ?? 0, details: typeof r.details === "object" && r.details !== null ? ((r.details as Record<string, unknown>).message as string) ?? JSON.stringify(r.details) : String(r.details) }));
    }
  } catch { /* fall through */ }
  return logStore.get(jobId) ?? [];
}

export function _resetLogStore(): void { logStore.clear(); }
