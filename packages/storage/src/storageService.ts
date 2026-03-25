import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3Client.js";
import type { Readable } from "node:stream";

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface ListFilesResult {
  files: { key: string; size: number; lastModified: Date | undefined }[];
  nextToken: string | undefined;
}

export interface FileMetadata {
  size: number | undefined;
  contentType: string | undefined;
  lastModified: Date | undefined;
}

/**
 * Upload a file to S3.
 */
export async function uploadFile(
  bucket: string,
  key: string,
  body: Buffer | Readable | string,
  contentType: string,
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);

  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.AWS_REGION ?? "us-east-1";
  const url = endpoint
    ? `${endpoint}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { url, key, bucket };
}

/**
 * Download a file from S3 and return its body as a readable stream.
 */
export async function downloadFile(
  bucket: string,
  key: string,
): Promise<Readable> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.Body as Readable;
}

/**
 * Generate a pre-signed URL for temporary access to a private object.
 */
export async function getSignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return awsGetSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3.
 */
export async function deleteFile(
  bucket: string,
  key: string,
): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * List files in an S3 bucket under a given prefix.
 */
export async function listFiles(
  bucket: string,
  prefix: string,
  continuationToken?: string,
): Promise<ListFilesResult> {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    ContinuationToken: continuationToken,
  });

  const response = await s3Client.send(command);

  const files = (response.Contents ?? []).map((item) => ({
    key: item.Key!,
    size: item.Size ?? 0,
    lastModified: item.LastModified,
  }));

  return {
    files,
    nextToken: response.NextContinuationToken,
  };
}

/**
 * Check whether a file exists in S3.
 */
export async function fileExists(
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve metadata (size, content type, last modified) for an S3 object.
 */
export async function getFileMetadata(
  bucket: string,
  key: string,
): Promise<FileMetadata> {
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    size: response.ContentLength,
    contentType: response.ContentType,
    lastModified: response.LastModified,
  };
}
