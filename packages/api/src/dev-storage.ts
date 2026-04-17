import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import type {
  DocumentSourceStorageClient,
  UploadStorageClient,
} from './upload/storage/r2.js';

const DEV_BUCKET_NAME = 'dev-bucket';
const DEV_STORAGE_ROOT = join(tmpdir(), 'ai-tutor-pwa-dev-storage');

export class DevInMemoryR2StorageClient
  implements UploadStorageClient, DocumentSourceStorageClient
{
  public async putObject(input: {
    body: Buffer;
    contentLength: number;
    contentType: string;
    key: string;
    metadata: Record<string, string>;
  }): Promise<{
    bucket: string;
    key: string;
  }> {
    const objectPath = resolveObjectPath(input.key);
    const metadataPath = resolveMetadataPath(input.key);

    await mkdir(dirname(objectPath), { recursive: true });
    await writeFile(objectPath, input.body);
    await writeFile(metadataPath, JSON.stringify(input.metadata), 'utf8');

    return {
      bucket: DEV_BUCKET_NAME,
      key: input.key,
    };
  }

  public async getObject(input: {
    key: string;
  }): Promise<{
    body: Buffer;
    bucket: string;
    key: string;
    metadata: Record<string, string>;
  }> {
    const objectPath = resolveObjectPath(input.key);
    const metadataPath = resolveMetadataPath(input.key);
    const [body, rawMetadata] = await Promise.all([
      readFile(objectPath),
      readFile(metadataPath, 'utf8').catch(() => '{}'),
    ]);

    return {
      body,
      bucket: DEV_BUCKET_NAME,
      key: input.key,
      metadata: safeParseMetadata(rawMetadata),
    };
  }

  public async deleteObject(input: {
    key: string;
  }): Promise<void> {
    await Promise.all([
      rm(resolveObjectPath(input.key), { force: true }),
      rm(resolveMetadataPath(input.key), { force: true }),
    ]);
  }
}

export function shouldUseDevStorage(r2Endpoint: string): boolean {
  return r2Endpoint.includes('example-account-id');
}

function resolveObjectPath(key: string): string {
  return join(DEV_STORAGE_ROOT, key);
}

function resolveMetadataPath(key: string): string {
  return `${resolveObjectPath(key)}.metadata.json`;
}

function safeParseMetadata(rawMetadata: string): Record<string, string> {
  try {
    const parsed = JSON.parse(rawMetadata) as Record<string, string>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

