import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

import type { ApiEnv } from '../../config/env.js';

export interface UploadStorageClient {
  putObject(input: {
    body: Buffer;
    contentLength: number;
    contentType: string;
    key: string;
    metadata: Record<string, string>;
  }): Promise<{
    bucket: string;
    key: string;
  }>;
}

export interface DocumentSourceStorageClient {
  getObject(input: {
    key: string;
  }): Promise<{
    body: Buffer;
    bucket: string;
    key: string;
    metadata: Record<string, string>;
  }>;
}

class R2StorageClient implements UploadStorageClient, DocumentSourceStorageClient {
  private readonly bucketName: string;
  private readonly client: S3Client;

  public constructor(
    env: Pick<
      ApiEnv,
      | 'R2_ACCESS_KEY_ID'
      | 'R2_BUCKET_NAME'
      | 'R2_ENDPOINT'
      | 'R2_SECRET_ACCESS_KEY'
    >,
  ) {
    this.bucketName = env.R2_BUCKET_NAME;
    this.client = new S3Client({
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
      endpoint: env.R2_ENDPOINT,
      region: 'auto',
    });
  }

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
    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.bucketName,
        ContentLength: input.contentLength,
        ContentType: input.contentType,
        Key: input.key,
        Metadata: input.metadata,
      }),
    );

    return {
      bucket: this.bucketName,
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
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
      }),
    );

    if (response.Body === undefined) {
      throw new Error(`Object ${input.key} was not found in bucket ${this.bucketName}`);
    }

    return {
      body: await toBuffer(response.Body),
      bucket: this.bucketName,
      key: input.key,
      metadata: response.Metadata ?? {},
    };
  }
}

export function createR2UploadStorageClient(
  env: Pick<
    ApiEnv,
    | 'R2_ACCESS_KEY_ID'
    | 'R2_BUCKET_NAME'
    | 'R2_ENDPOINT'
    | 'R2_SECRET_ACCESS_KEY'
  >,
): UploadStorageClient {
  return new R2StorageClient(env);
}

export function createR2DocumentSourceStorageClient(
  env: Pick<
    ApiEnv,
    | 'R2_ACCESS_KEY_ID'
    | 'R2_BUCKET_NAME'
    | 'R2_ENDPOINT'
    | 'R2_SECRET_ACCESS_KEY'
  >,
): DocumentSourceStorageClient {
  return new R2StorageClient(env);
}

async function toBuffer(stream: unknown): Promise<Buffer> {
  if (
    typeof stream === 'object' &&
    stream !== null &&
    'transformToByteArray' in stream &&
    typeof stream.transformToByteArray === 'function'
  ) {
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (stream instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  throw new Error('Unsupported object body stream');
}
