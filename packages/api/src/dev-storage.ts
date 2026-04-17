import type {
  DocumentSourceStorageClient,
  UploadStorageClient,
} from './upload/storage/r2.js';

const DEV_BUCKET_NAME = 'dev-bucket';

export class DevInMemoryR2StorageClient
  implements UploadStorageClient, DocumentSourceStorageClient
{
  private readonly storage = new Map<
    string,
    {
      body: Buffer;
      metadata: Record<string, string>;
    }
  >();

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
    this.storage.set(input.key, {
      body: input.body,
      metadata: input.metadata,
    });

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
    const storedObject = this.storage.get(input.key);

    if (storedObject === undefined) {
      throw new Error(`Object ${input.key} was not found in ${DEV_BUCKET_NAME}`);
    }

    return {
      body: storedObject.body,
      bucket: DEV_BUCKET_NAME,
      key: input.key,
      metadata: storedObject.metadata,
    };
  }

  public async deleteObject(input: {
    key: string;
  }): Promise<void> {
    this.storage.delete(input.key);
  }
}

export function shouldUseDevStorage(r2Endpoint: string): boolean {
  return r2Endpoint.includes('example-account-id');
}

