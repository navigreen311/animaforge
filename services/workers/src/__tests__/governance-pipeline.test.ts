import { describe, it, expect, vi, beforeEach } from "vitest";
import { runGovernancePipeline, GovernancePipelineJob } from "../workers/governancePipeline.js";
import { runPreCheck } from "../workers/preGenerationCheck.js";

/* ---------- Mock the governance client ---------- */

vi.mock("../utils/governanceClient.js", () => ({
  moderateContent: vi.fn(),
  validateConsent: vi.fn(),
  signC2PA: vi.fn(),
  embedWatermark: vi.fn(),
  preCheckSafety: vi.fn(),
}));

import {
  moderateContent,
  validateConsent,
  signC2PA,
  embedWatermark,
  preCheckSafety,
} from "../utils/governanceClient.js";

const mockModerate = vi.mocked(moderateContent);
const mockConsent = vi.mocked(validateConsent);
const mockSign = vi.mocked(signC2PA);
const mockWatermark = vi.mocked(embedWatermark);
const mockPreCheck = vi.mocked(preCheckSafety);

/* ---------- Fixtures ---------- */

function makeJob(overrides?: Partial<GovernancePipelineJob>): GovernancePipelineJob {
  return {
    jobId: "job-001",
    outputUrl: "https://cdn.animaforge.io/outputs/test/video/out.mp4",
    contentType: "video",
    characterRefs: ["char-a", "char-b"],
    consentTypes: ["likeness", "voice"],
    metadata: { creator: "user-1", project: "proj-1" },
    ...overrides,
  };
}

function setupAllPassing(): void {
  mockModerate.mockResolvedValue({
    allowed: true,
    categories: [],
    confidence: 0.99,
    jobId: "job-001",
  });
  mockConsent.mockResolvedValue({
    valid: true,
    missingConsents: [],
  });
  mockSign.mockResolvedValue({
    manifestId: "manifest-001",
    signature: "sig-abc",
    signedAt: "2026-03-25T00:00:00Z",
  });
  mockWatermark.mockResolvedValue({
    watermarkId: "wm-001",
    embeddedAt: "2026-03-25T00:00:01Z",
  });
}

/* ---------- Tests ---------- */

describe("Governance Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass when all stages succeed", async () => {
    setupAllPassing();

    const result = await runGovernancePipeline(makeJob());

    expect(result.passed).toBe(true);
    expect(result.manifest).toEqual({
      manifestId: "manifest-001",
      signature: "sig-abc",
      signedAt: "2026-03-25T00:00:00Z",
    });
    expect(result.watermarkId).toBe("wm-001");
    expect(result.blockedReason).toBeUndefined();
  });

  it("should block when content moderation flags unsafe content", async () => {
    mockModerate.mockResolvedValue({
      allowed: false,
      categories: ["violence", "gore"],
      confidence: 0.95,
      jobId: "job-001",
    });

    const result = await runGovernancePipeline(makeJob());

    expect(result.passed).toBe(false);
    expect(result.blockedReason).toContain("violence");
    expect(result.blockedReason).toContain("gore");
    // Should not proceed to later stages
    expect(mockConsent).not.toHaveBeenCalled();
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockWatermark).not.toHaveBeenCalled();
  });

  it("should block when consent validation finds missing consents", async () => {
    mockModerate.mockResolvedValue({
      allowed: true,
      categories: [],
      confidence: 0.99,
      jobId: "job-001",
    });
    mockConsent.mockResolvedValue({
      valid: false,
      missingConsents: ["likeness:char-b", "voice:char-b"],
    });

    const result = await runGovernancePipeline(makeJob());

    expect(result.passed).toBe(false);
    expect(result.blockedReason).toContain("Missing consents");
    expect(result.blockedReason).toContain("likeness:char-b");
    // Should not proceed to signing or watermarking
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockWatermark).not.toHaveBeenCalled();
  });

  it("should create a C2PA manifest on success", async () => {
    setupAllPassing();

    const result = await runGovernancePipeline(makeJob());

    expect(mockSign).toHaveBeenCalledWith({
      jobId: "job-001",
      outputUrl: "https://cdn.animaforge.io/outputs/test/video/out.mp4",
      metadata: { creator: "user-1", project: "proj-1" },
    });
    expect(result.manifest?.manifestId).toBe("manifest-001");
    expect(result.manifest?.signature).toBe("sig-abc");
  });

  it("should embed a watermark on success", async () => {
    setupAllPassing();

    const result = await runGovernancePipeline(makeJob());

    expect(mockWatermark).toHaveBeenCalledWith(
      "job-001",
      "https://cdn.animaforge.io/outputs/test/video/out.mp4",
      { creator: "user-1", project: "proj-1" },
    );
    expect(result.watermarkId).toBe("wm-001");
  });

  it("should retry C2PA signing up to 3 times then alert", async () => {
    mockModerate.mockResolvedValue({
      allowed: true,
      categories: [],
      confidence: 0.99,
      jobId: "job-001",
    });
    mockConsent.mockResolvedValue({ valid: true, missingConsents: [] });
    mockSign
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("service down"));

    const result = await runGovernancePipeline(makeJob());

    expect(result.passed).toBe(false);
    expect(result.blockedReason).toContain("C2PA signing failed after 3 attempts");
    expect(mockSign).toHaveBeenCalledTimes(3);
  });

  it("should succeed when C2PA signing recovers on retry", async () => {
    mockModerate.mockResolvedValue({
      allowed: true,
      categories: [],
      confidence: 0.99,
      jobId: "job-001",
    });
    mockConsent.mockResolvedValue({ valid: true, missingConsents: [] });
    mockSign
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        manifestId: "manifest-002",
        signature: "sig-retry",
        signedAt: "2026-03-25T00:00:05Z",
      });
    mockWatermark.mockResolvedValue({
      watermarkId: "wm-002",
      embeddedAt: "2026-03-25T00:00:06Z",
    });

    const result = await runGovernancePipeline(makeJob());

    expect(result.passed).toBe(true);
    expect(result.manifest?.manifestId).toBe("manifest-002");
    expect(mockSign).toHaveBeenCalledTimes(2);
  });

  it("should flag for manual review when watermark fails but still pass", async () => {
    mockModerate.mockResolvedValue({
      allowed: true,
      categories: [],
      confidence: 0.99,
      jobId: "job-001",
    });
    mockConsent.mockResolvedValue({ valid: true, missingConsents: [] });
    mockSign.mockResolvedValue({
      manifestId: "manifest-003",
      signature: "sig-wm-fail",
      signedAt: "2026-03-25T00:00:00Z",
    });
    mockWatermark.mockRejectedValue(new Error("watermark service down"));

    const progressEvents: Array<[string, string]> = [];
    const result = await runGovernancePipeline(makeJob(), (stage, status) => {
      progressEvents.push([stage, status]);
    });

    expect(result.passed).toBe(true);
    expect(result.watermarkId).toBeUndefined();
    expect(progressEvents).toContainEqual(["watermarking", "manual_review"]);
  });

  it("should emit progress events for each stage", async () => {
    setupAllPassing();

    const progressEvents: Array<[string, string]> = [];
    await runGovernancePipeline(makeJob(), (stage, status) => {
      progressEvents.push([stage, status]);
    });

    expect(progressEvents).toContainEqual(["content_moderation", "running"]);
    expect(progressEvents).toContainEqual(["content_moderation", "passed"]);
    expect(progressEvents).toContainEqual(["consent_validation", "running"]);
    expect(progressEvents).toContainEqual(["consent_validation", "passed"]);
    expect(progressEvents).toContainEqual(["c2pa_signing", "running"]);
    expect(progressEvents).toContainEqual(["c2pa_signing", "passed"]);
    expect(progressEvents).toContainEqual(["watermarking", "running"]);
    expect(progressEvents).toContainEqual(["watermarking", "passed"]);
  });
});

describe("Pre-Generation Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow generation when prompt is safe and consents are valid", async () => {
    mockPreCheck.mockResolvedValue({
      safe: true,
      blockedCategories: [],
    });
    mockConsent.mockResolvedValue({
      valid: true,
      missingConsents: [],
    });

    const result = await runPreCheck(
      "A cartoon cat playing piano",
      { characters: ["cat"] },
      ["char-a"],
    );

    expect(result.allowed).toBe(true);
    expect(result.blockedCategories).toBeUndefined();
    expect(result.missingConsents).toBeUndefined();
  });

  it("should block when pre-check detects unsafe prompt", async () => {
    mockPreCheck.mockResolvedValue({
      safe: false,
      blockedCategories: ["violence", "hate_speech"],
    });
    mockConsent.mockResolvedValue({
      valid: true,
      missingConsents: [],
    });

    const result = await runPreCheck(
      "unsafe prompt content",
      { characters: [] },
      ["char-a"],
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toEqual(["violence", "hate_speech"]);
  });

  it("should block when consents are missing", async () => {
    mockPreCheck.mockResolvedValue({
      safe: true,
      blockedCategories: [],
    });
    mockConsent.mockResolvedValue({
      valid: false,
      missingConsents: ["likeness:char-x"],
    });

    const result = await runPreCheck(
      "A cartoon cat playing piano",
      { characters: ["cat"] },
      ["char-x"],
    );

    expect(result.allowed).toBe(false);
    expect(result.missingConsents).toEqual(["likeness:char-x"]);
  });

  it("should report both safety and consent issues when both fail", async () => {
    mockPreCheck.mockResolvedValue({
      safe: false,
      blockedCategories: ["nsfw"],
    });
    mockConsent.mockResolvedValue({
      valid: false,
      missingConsents: ["voice:char-y"],
    });

    const result = await runPreCheck(
      "problematic prompt",
      { characters: [] },
      ["char-y"],
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toEqual(["nsfw"]);
    expect(result.missingConsents).toEqual(["voice:char-y"]);
  });
});
