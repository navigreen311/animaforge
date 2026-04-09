import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET!;
const AWS_CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN!;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const s3 = new S3Client({ region: AWS_REGION });

const PRESIGN_EXPIRES_SECONDS = 3600;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PresignedUploadParams {
  filename: string;
  contentType: string;
  folder: string;
  userId: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  assetId: string;
}

export interface ThumbnailParams {
  assetId: string;
  s3Key: string;
  contentType: string;
}

export interface ThumbnailResult {
  thumbnailKey: string;
  thumbnailUrl: string;
  data?: Buffer | number[];
}

/* ------------------------------------------------------------------ */
/*  Presigned upload URL                                               */
/* ------------------------------------------------------------------ */

/**
 * Generate a presigned PUT URL so the client can upload directly to S3.
 * Returns the upload URL, the eventual public (CloudFront) URL, and a
 * unique asset ID.
 */
export async function getPresignedUploadUrl(
  params: PresignedUploadParams,
): Promise<PresignedUploadResult> {
  const { filename, contentType, folder, userId } = params;

  const assetId = randomUUID();
  const ext = filename.includes('.') ? filename.split('.').pop() : '';
  const key = `${folder}/${userId}/${assetId}${ext ? `.${ext}` : ''}`;

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
    Metadata: {
      'x-amz-meta-user-id': userId,
      'x-amz-meta-asset-id': assetId,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: PRESIGN_EXPIRES_SECONDS,
  });

  const publicUrl = `https://${AWS_CLOUDFRONT_DOMAIN}/${key}`;

  return { uploadUrl, publicUrl, assetId };
}

/* ------------------------------------------------------------------ */
/*  Thumbnail generation                                               */
/* ------------------------------------------------------------------ */

/**
 * Generate a thumbnail for the given asset.
 *
 * - IMAGE  → resize to 400x400 WEBP via sharp
 * - VIDEO  → extract a single frame via ffmpeg, then resize
 * - AUDIO  → return waveform sample data (placeholder)
 */
export async function generateThumbnail(
  params: ThumbnailParams,
): Promise<ThumbnailResult> {
  const { assetId, s3Key, contentType } = params;
  const thumbnailKey = `thumbnails/${assetId}.webp`;

  if (contentType.startsWith('image/')) {
    // Dynamic import so the module is only loaded when needed
    const sharp = (await import('sharp')).default;
    const original = await downloadFromS3(s3Key);
    const thumbnail = await sharp(original)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    await uploadToS3(thumbnail, 'image/webp', thumbnailKey);

    return {
      thumbnailKey,
      thumbnailUrl: `https://${AWS_CLOUDFRONT_DOMAIN}/${thumbnailKey}`,
    };
  }

  if (contentType.startsWith('video/')) {
    // Extract a single frame at 1 second using ffmpeg (child_process)
    const { execSync } = await import('child_process');
    const { tmpdir } = await import('os');
    const path = await import('path');
    const fs = await import('fs');

    const original = await downloadFromS3(s3Key);
    const tmpInput = path.join(tmpdir(), `${assetId}-input.mp4`);
    const tmpOutput = path.join(tmpdir(), `${assetId}-thumb.webp`);

    fs.writeFileSync(tmpInput, original);

    execSync(
      `ffmpeg -y -i "${tmpInput}" -ss 00:00:01 -vframes 1 -vf scale=400:400:force_original_aspect_ratio=decrease "${tmpOutput}"`,
      { stdio: 'pipe' },
    );

    const sharp = (await import('sharp')).default;
    const thumbnail = await sharp(fs.readFileSync(tmpOutput))
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // Clean up temp files
    fs.unlinkSync(tmpInput);
    fs.unlinkSync(tmpOutput);

    await uploadToS3(thumbnail, 'image/webp', thumbnailKey);

    return {
      thumbnailKey,
      thumbnailUrl: `https://${AWS_CLOUDFRONT_DOMAIN}/${thumbnailKey}`,
    };
  }

  if (contentType.startsWith('audio/')) {
    // Return placeholder waveform data (128 sample points normalised 0-1)
    const waveform = Array.from({ length: 128 }, () =>
      Math.round(Math.random() * 100) / 100,
    );

    return {
      thumbnailKey: `waveforms/${assetId}.json`,
      thumbnailUrl: `https://${AWS_CLOUDFRONT_DOMAIN}/waveforms/${assetId}.json`,
      data: waveform,
    };
  }

  throw new Error(`Unsupported content type for thumbnail: ${contentType}`);
}

/* ------------------------------------------------------------------ */
/*  S3 utilities                                                       */
/* ------------------------------------------------------------------ */

/**
 * Upload a buffer to S3 at the given key.
 */
export async function uploadToS3(
  buffer: Buffer,
  contentType: string,
  key: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(command);
}

/**
 * Download an object from S3 and return its contents as a Buffer.
 */
export async function downloadFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
  });

  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error(`Empty response body for S3 key: ${key}`);
  }

  // Convert the readable stream to a buffer
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
