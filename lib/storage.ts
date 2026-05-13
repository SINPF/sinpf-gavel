// Storage abstraction — MinIO for local dev, Azure Blob Storage for production.
// Callers import uploadFile / getDownloadUrl from here and never touch the SDK directly.
//
// Switch is driven by the presence of AZURE_STORAGE_ACCOUNT in the environment.

// ── MinIO (local dev) ─────────────────────────────────────────────────────────

async function minioUpload(objectKey: string, file: File): Promise<string> {
  const { Client } = await import("minio");
  const client = new Client({
    endPoint:  process.env.MINIO_ENDPOINT!,
    port:      parseInt(process.env.MINIO_PORT!),
    useSSL:    process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });

  const bucket = process.env.MINIO_BUCKET!;
  const exists = await client.bucketExists(bucket);
  if (!exists) await client.makeBucket(bucket);

  const buffer = Buffer.from(await file.arrayBuffer());
  await client.putObject(bucket, objectKey, buffer, buffer.length, {
    "Content-Type": file.type || "application/octet-stream",
  });
  return objectKey;
}

async function minioGetUrl(objectKey: string, expirySeconds: number): Promise<string> {
  const { Client } = await import("minio");
  const client = new Client({
    endPoint:  process.env.MINIO_ENDPOINT!,
    port:      parseInt(process.env.MINIO_PORT!),
    useSSL:    process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });

  const url = await client.presignedGetObject(process.env.MINIO_BUCKET!, objectKey, expirySeconds);

  // Rewrite internal Docker hostname to public-facing URL for browser access.
  const publicUrl = process.env.MINIO_PUBLIC_URL;
  if (publicUrl) {
    const scheme   = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
    const internal = `${scheme}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
    return url.replace(internal, publicUrl.replace(/\/$/, ""));
  }

  return url;
}

// ── Azure Blob Storage (production) ──────────────────────────────────────────
// TODO: install @azure/storage-blob when switching to Azure.
//
// async function azureUpload(objectKey: string, file: File): Promise<string> {
//   const { BlobServiceClient, StorageSharedKeyCredential } = await import("@azure/storage-blob");
//   const credential = new StorageSharedKeyCredential(
//     process.env.AZURE_STORAGE_ACCOUNT!,
//     process.env.AZURE_STORAGE_KEY!,
//   );
//   const client = new BlobServiceClient(
//     `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
//     credential,
//   );
//   const container = client.getContainerClient(process.env.AZURE_STORAGE_CONTAINER!);
//   await container.createIfNotExists();
//   const buffer = Buffer.from(await file.arrayBuffer());
//   await container.getBlockBlobClient(objectKey).uploadData(buffer, {
//     blobHTTPHeaders: { blobContentType: file.type || "application/octet-stream" },
//   });
//   return objectKey;
// }
//
// async function azureGetUrl(objectKey: string, expirySeconds: number): Promise<string> {
//   const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol } = await import("@azure/storage-blob");
//   const credential = new StorageSharedKeyCredential(
//     process.env.AZURE_STORAGE_ACCOUNT!,
//     process.env.AZURE_STORAGE_KEY!,
//   );
//   const sasToken = generateBlobSASQueryParameters(
//     {
//       containerName: process.env.AZURE_STORAGE_CONTAINER!,
//       blobName:      objectKey,
//       permissions:   BlobSASPermissions.parse("r"),
//       startsOn:      new Date(),
//       expiresOn:     new Date(Date.now() + expirySeconds * 1000),
//       protocol:      SASProtocol.Https,
//     },
//     credential,
//   ).toString();
//   return `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${process.env.AZURE_STORAGE_CONTAINER}/${objectKey}?${sasToken}`;
// }

// ── Public API ────────────────────────────────────────────────────────────────

const isAzure = !!process.env.AZURE_STORAGE_ACCOUNT;

export async function uploadFile(objectKey: string, file: File): Promise<string> {
  if (isAzure) {
    throw new Error("Azure storage is not yet wired up — uncomment azureUpload in lib/storage.ts");
  }
  return minioUpload(objectKey, file);
}

export async function getDownloadUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
  if (isAzure) {
    throw new Error("Azure storage is not yet wired up — uncomment azureGetUrl in lib/storage.ts");
  }
  return minioGetUrl(objectKey, expirySeconds);
}
