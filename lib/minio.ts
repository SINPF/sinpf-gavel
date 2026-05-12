import { Client } from "minio";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT!),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

const BUCKET = process.env.MINIO_BUCKET!;

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) await minioClient.makeBucket(BUCKET);
}

export async function uploadFile(objectKey: string, file: File): Promise<string> {
  await ensureBucket();
  const buffer = Buffer.from(await file.arrayBuffer());
  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
    "Content-Type": file.type || "application/octet-stream",
  });
  return objectKey;
}

export async function getPresignedUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
  const url = await minioClient.presignedGetObject(BUCKET, objectKey, expirySeconds);

  // In containerised deployments the SDK signs against the internal endpoint
  // (e.g. http://minio:9000). Rewrite to the public-facing URL so browsers
  // can reach it through the nginx proxy.
  const publicUrl = process.env.MINIO_PUBLIC_URL;
  if (publicUrl) {
    const scheme   = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
    const internal = `${scheme}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
    return url.replace(internal, publicUrl.replace(/\/$/, ""));
  }

  return url;
}
