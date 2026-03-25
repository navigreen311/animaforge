import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the S3 client before importing modules that use it
// ---------------------------------------------------------------------------

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => {
  const actual = {
    S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ ...input, _type: "PutObject" })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ ...input, _type: "GetObject" })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ ...input, _type: "DeleteObject" })),
    ListObjectsV2Command: vi.fn().mockImplementation((input) => ({ ...input, _type: "ListObjectsV2" })),
    HeadObjectCommand: vi.fn().mockImplementation((input) => ({ ...input, _type: "HeadObject" })),
  };
  return actual;
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com/file"),
}));

import {
  uploadFile,
  downloadFile,
  getSignedUrl,
  deleteFile,
  listFiles,
  fileExists,
  getFileMetadata,
} from "../storageService.js";

import {
  generateAssetKey,
  generateAvatarKey,
  generateExportKey,
  generateThumbnailKey,
  getAllowedMimeTypes,
  validateFileSize,
} from "../uploadHelpers.js";

import {
  getLifecyclePolicy,
  STORAGE_TIERS,
} from "../lifecycleRules.js";

// ---------------------------------------------------------------------------
// Storage service tests
// ---------------------------------------------------------------------------

describe("storageService", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("uploadFile sends PutObjectCommand and returns url, key, bucket", async () => {
    sendMock.mockResolvedValueOnce({});
    const result = await uploadFile("my-bucket", "assets/pic.png", Buffer.from("data"), "image/png");

    expect(sendMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      url: expect.stringContaining("my-bucket"),
      key: "assets/pic.png",
      bucket: "my-bucket",
    });
  });

  it("downloadFile returns the response body", async () => {
    const fakeStream = { pipe: vi.fn() };
    sendMock.mockResolvedValueOnce({ Body: fakeStream });

    const body = await downloadFile("my-bucket", "assets/pic.png");
    expect(body).toBe(fakeStream);
  });

  it("getSignedUrl returns a pre-signed URL string", async () => {
    const url = await getSignedUrl("my-bucket", "assets/pic.png", 900);
    expect(url).toBe("https://signed-url.example.com/file");
  });

  it("deleteFile sends DeleteObjectCommand", async () => {
    sendMock.mockResolvedValueOnce({});
    await deleteFile("my-bucket", "assets/pic.png");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("listFiles returns mapped file list and nextToken", async () => {
    sendMock.mockResolvedValueOnce({
      Contents: [
        { Key: "a.png", Size: 100, LastModified: new Date("2025-01-01") },
        { Key: "b.png", Size: 200, LastModified: new Date("2025-02-01") },
      ],
      NextContinuationToken: "token-abc",
    });

    const result = await listFiles("my-bucket", "assets/");
    expect(result.files).toHaveLength(2);
    expect(result.files[0].key).toBe("a.png");
    expect(result.nextToken).toBe("token-abc");
  });

  it("fileExists returns true when object exists", async () => {
    sendMock.mockResolvedValueOnce({});
    const exists = await fileExists("my-bucket", "assets/pic.png");
    expect(exists).toBe(true);
  });

  it("fileExists returns false when HeadObject throws", async () => {
    sendMock.mockRejectedValueOnce(new Error("NotFound"));
    const exists = await fileExists("my-bucket", "missing.png");
    expect(exists).toBe(false);
  });

  it("getFileMetadata returns size, contentType, lastModified", async () => {
    sendMock.mockResolvedValueOnce({
      ContentLength: 5000,
      ContentType: "image/png",
      LastModified: new Date("2025-06-01"),
    });

    const meta = await getFileMetadata("my-bucket", "assets/pic.png");
    expect(meta.size).toBe(5000);
    expect(meta.contentType).toBe("image/png");
    expect(meta.lastModified).toEqual(new Date("2025-06-01"));
  });
});

// ---------------------------------------------------------------------------
// Upload helpers tests
// ---------------------------------------------------------------------------

describe("uploadHelpers", () => {
  it("generateAssetKey builds correct pattern with timestamp", () => {
    const key = generateAssetKey("proj-1", "image", "photo.png");
    expect(key).toMatch(/^projects\/proj-1\/image\/\d+-photo\.png$/);
  });

  it("generateAvatarKey builds correct pattern", () => {
    const key = generateAvatarKey("char-42", "face.jpg");
    expect(key).toBe("avatars/char-42/face.jpg");
  });

  it("generateExportKey builds correct pattern", () => {
    const key = generateExportKey("proj-1", "job-99", "mp4");
    expect(key).toBe("exports/proj-1/job-99/output.mp4");
  });

  it("generateThumbnailKey replaces extension with -thumb.webp", () => {
    const key = generateThumbnailKey("projects/proj-1/image/123-photo.png");
    expect(key).toBe("projects/proj-1/image/123-photo-thumb.webp");
  });

  it("getAllowedMimeTypes returns all categories", () => {
    const types = getAllowedMimeTypes();
    expect(Object.keys(types)).toEqual(["video", "image", "audio", "model"]);
    expect(types.video).toContain("video/mp4");
  });

  it("validateFileSize returns true when within limit", () => {
    expect(validateFileSize(10 * 1024 * 1024, "image")).toBe(true); // 10 MB < 50 MB
  });

  it("validateFileSize returns false when over limit", () => {
    expect(validateFileSize(60 * 1024 * 1024, "image")).toBe(false); // 60 MB > 50 MB
  });
});

// ---------------------------------------------------------------------------
// Lifecycle rules tests
// ---------------------------------------------------------------------------

describe("lifecycleRules", () => {
  it("STORAGE_TIERS contains hot, warm, cold", () => {
    expect(Object.keys(STORAGE_TIERS)).toEqual(["hot", "warm", "cold"]);
  });

  it("getLifecyclePolicy('hot') returns no transitions", () => {
    const policy = getLifecyclePolicy("hot");
    expect(policy.Transitions).toHaveLength(0);
    expect(policy.ID).toBe("animaforge-hot-lifecycle");
  });

  it("getLifecyclePolicy('warm') returns IA transition at 30 days", () => {
    const policy = getLifecyclePolicy("warm");
    expect(policy.Transitions).toHaveLength(1);
    expect(policy.Transitions[0]).toEqual({ Days: 30, StorageClass: "STANDARD_IA" });
  });

  it("getLifecyclePolicy('cold') returns IA + Glacier transitions", () => {
    const policy = getLifecyclePolicy("cold");
    expect(policy.Transitions).toHaveLength(2);
    expect(policy.Transitions[1]).toEqual({ Days: 90, StorageClass: "GLACIER" });
  });
});
