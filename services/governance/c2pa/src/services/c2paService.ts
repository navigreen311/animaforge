import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { prisma, isPrismaAvailable } from "../db";
import type { C2PAManifest, SignRequest, StoredManifestEntry, VerifyResponse } from "../models/c2paSchemas";

const manifestStore = new Map<string, StoredManifestEntry>();
const outputIndex = new Map<string, string>();
const SIGNING_PRIVATE_KEY = process.env.C2PA_PRIVATE_KEY ?? undefined;

function signPayload(payload: string): string {
  if (SIGNING_PRIVATE_KEY) { const sign = crypto.createSign("SHA256"); sign.update(payload); sign.end(); return sign.sign(SIGNING_PRIVATE_KEY, "hex"); }
  const hmac = crypto.createHmac("sha256", "animaforge-c2pa-dev-secret"); hmac.update(payload); return `c2pa-sha256:${hmac.digest("hex")}`;
}

async function storeManifestInDb(jobId: string, manifest: C2PAManifest, signature: string, outputId: string): Promise<void> {
  await prisma.auditTrail.create({ data: { userId: manifest["animaforge:metadata"].user_id, action: "c2pa:manifest", resource: "manifest", resourceId: jobId, details: { manifest, signature, output_id: outputId, created_at: manifest["c2pa:claim"].created_at } } });
}

async function lookupManifestFromDb(jobId: string): Promise<StoredManifestEntry | null> {
  const row = await prisma.auditTrail.findFirst({ where: { action: "c2pa:manifest", resourceId: jobId }, orderBy: { createdAt: "desc" } });
  if (!row) return null;
  const d = row.details as Record<string, unknown>;
  return { manifest: d.manifest as C2PAManifest, signature: d.signature as string, output_id: d.output_id as string, created_at: d.created_at as string };
}

async function lookupManifestByOutputId(outputId: string): Promise<{ jobId: string; entry: StoredManifestEntry } | null> {
  const rows = await prisma.auditTrail.findMany({ where: { action: "c2pa:manifest" }, orderBy: { createdAt: "desc" } });
  for (const row of rows) { const d = row.details as Record<string, unknown>; if (d.output_id === outputId) { return { jobId: row.resourceId, entry: { manifest: d.manifest as C2PAManifest, signature: d.signature as string, output_id: d.output_id as string, created_at: d.created_at as string } }; } }
  return null;
}

export function buildManifest(params: SignRequest): C2PAManifest {
  const now = new Date().toISOString();
  return { "@context": ["https://c2pa.org/statements/1.0", "https://www.w3.org/ns/activitystreams", "https://animaforge.ai/ns/governance/1.0"], "dc:title": `AnimaForge AI-Generated Asset - Job ${params.job_id}`, "c2pa:claim": { claim_generator: "AnimaForge/C2PA-Signing-Service", claim_generator_version: "1.0.0", signature_type: "SHA256", created_at: now, assertions: [{ label: "c2pa.actions", data: { actions: [{ action: "c2pa.created", softwareAgent: "AnimaForge Pipeline", when: now }] } }, { label: "c2pa.hash.data", data: { name: "input_hash", hash: params.input_hash, algorithm: "sha256" } }, { label: "animaforge.consent", data: { consent_ids: params.consent_ids, user_id: params.user_id } }, { label: "animaforge.model", data: { model_id: params.model_id, output_url: params.output_url } }] }, "animaforge:metadata": { job_id: params.job_id, project_id: params.project_id, shot_id: params.shot_id, model_id: params.model_id, input_hash: params.input_hash, user_id: params.user_id, consent_ids: params.consent_ids, output_url: params.output_url } };
}

export function signManifest(manifest: C2PAManifest): string { return signPayload(JSON.stringify(manifest)); }

function storeInMemory(jobId: string, manifest: C2PAManifest, signature: string, outputId: string): void {
  manifestStore.set(jobId, { manifest, signature, output_id: outputId, created_at: manifest["c2pa:claim"].created_at }); outputIndex.set(outputId, jobId);
}

export async function createManifest(params: SignRequest): Promise<{ manifest: C2PAManifest; signature: string; outputId: string }> {
  const manifest = buildManifest(params); const signature = signManifest(manifest); const outputId = uuidv4();
  try { if (await isPrismaAvailable()) { await storeManifestInDb(params.job_id, manifest, signature, outputId); } else { storeInMemory(params.job_id, manifest, signature, outputId); } } catch { storeInMemory(params.job_id, manifest, signature, outputId); }
  return { manifest, signature, outputId };
}

export async function verifyManifest(outputId: string): Promise<VerifyResponse> {
  let entry: StoredManifestEntry | null = null;
  try { if (await isPrismaAvailable()) { const result = await lookupManifestByOutputId(outputId); if (result) entry = result.entry; } } catch { /* fall through */ }
  if (!entry) { const jobId = outputIndex.get(outputId); if (jobId) entry = manifestStore.get(jobId) ?? null; }
  if (!entry) { return { valid: false, manifest: null, generator: null, created_at: null, model_id: null }; }
  const valid = entry.signature === signManifest(entry.manifest);
  return { valid, manifest: entry.manifest, generator: entry.manifest["c2pa:claim"].claim_generator, created_at: entry.manifest["c2pa:claim"].created_at, model_id: entry.manifest["animaforge:metadata"].model_id };
}

export async function getManifestByJobId(jobId: string): Promise<StoredManifestEntry | null> {
  try { if (await isPrismaAvailable()) { const entry = await lookupManifestFromDb(jobId); if (entry) return entry; } } catch { /* fall through */ }
  return manifestStore.get(jobId) ?? null;
}

export function clearStore(): void { manifestStore.clear(); outputIndex.clear(); }
