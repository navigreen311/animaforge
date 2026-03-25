import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

const router = Router();

interface FileTypeConfig {
  extensions: string[];
  mimePatterns: string[];
  maxSizeBytes: number;
  label: string;
}

const FILE_TYPES: Record<string, FileTypeConfig> = {
  image: {
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"],
    mimePatterns: ["image/"],
    maxSizeBytes: 50 * 1024 * 1024,
    label: "image",
  },
  video: {
    extensions: [".mp4", ".mov", ".avi", ".webm", ".mkv"],
    mimePatterns: ["video/"],
    maxSizeBytes: 500 * 1024 * 1024,
    label: "video",
  },
  audio: {
    extensions: [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a"],
    mimePatterns: ["audio/"],
    maxSizeBytes: 100 * 1024 * 1024,
    label: "audio",
  },
  "3d-model": {
    extensions: [".glb", ".gltf", ".fbx", ".obj", ".usdz"],
    mimePatterns: ["model/", "application/octet-stream"],
    maxSizeBytes: 500 * 1024 * 1024,
    label: "3d-model",
  },
};

function detectFileType(filename: string, mimeType?: string): string | null {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  for (const [type, cfg] of Object.entries(FILE_TYPES)) {
    if (cfg.extensions.includes(ext)) return type;
  }
  if (mimeType) {
    for (const [type, cfg] of Object.entries(FILE_TYPES)) {
      if (cfg.mimePatterns.some((p) => mimeType.startsWith(p))) return type;
    }
  }
  return null;
}

function generateS3Key(projectId: string, type: string, filename: string): string {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `projects/${projectId}/${type}/${timestamp}-${safeName}`;
}

router.post("/upload", (req: Request, res: Response): void => {
  const { filename, contentType, size, projectId } = req.body ?? {};

  if (!filename || !projectId) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_REQUEST", message: "filename and projectId are required" },
    });
    return;
  }

  const fileType = detectFileType(filename, contentType);
  if (!fileType) {
    res.status(400).json({
      success: false,
      error: { code: "UNSUPPORTED_FILE_TYPE", message: "File type not supported. Accepted: image, video, audio, 3d-model" },
    });
    return;
  }

  const config = FILE_TYPES[fileType];
  const fileSize = typeof size === "number" ? size : 0;

  if (fileSize > config.maxSizeBytes) {
    const maxMB = Math.round(config.maxSizeBytes / (1024 * 1024));
    res.status(400).json({
      success: false,
      error: { code: "FILE_TOO_LARGE", message: `${config.label} files must be under ${maxMB}MB` },
    });
    return;
  }

  const key = generateS3Key(projectId, fileType, filename);
  const mimeType = contentType ?? `${fileType === "3d-model" ? "application" : fileType}/${filename.split(".").pop()}`;

  res.status(201).json({
    success: true,
    data: { url: `https://cdn.animaforge.ai/${key}`, key, type: fileType, size: fileSize, mimeType },
  });
});

router.post("/upload/signed-url", (req: Request, res: Response): void => {
  const { filename, contentType, projectId } = req.body ?? {};

  if (!filename || !contentType || !projectId) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_REQUEST", message: "filename, contentType, and projectId are required" },
    });
    return;
  }

  const fileType = detectFileType(filename, contentType);
  if (!fileType) {
    res.status(400).json({
      success: false,
      error: { code: "UNSUPPORTED_FILE_TYPE", message: "File type not supported. Accepted: image, video, audio, 3d-model" },
    });
    return;
  }

  const key = generateS3Key(projectId, fileType, filename);
  const expiresIn = 3600;
  const uploadUrl = `https://s3.amazonaws.com/animaforge-uploads/${key}?X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=host&X-Amz-Signature=${randomUUID().replace(/-/g, "")}`;

  res.status(200).json({
    success: true,
    data: { uploadUrl, key, expiresIn },
  });
});

export default router;
