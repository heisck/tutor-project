import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

class R2UploadStorageClient implements UploadStorageClient {
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
  return new R2UploadStorageClient(env);
}
