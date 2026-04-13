import { Queue } from 'bullmq';

import type { ApiEnv } from '../config/env.js';

export interface DocumentProcessingQueue {
  close?(): Promise<void>;
  enqueue(input: {
    documentId: string;
    storageKey: string;
    userId: string;
  }): Promise<{
    jobId: string;
  }>;
}

class BullMqDocumentProcessingQueue implements DocumentProcessingQueue {
  private readonly queue: Queue;

  public constructor(env: Pick<ApiEnv, 'REDIS_URL'>) {
    this.queue = new Queue('document-processing', {
      connection: buildRedisConnectionOptions(env.REDIS_URL),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          delay: 1000,
          type: 'exponential',
        },
      },
    });
  }

  public async enqueue(input: {
    documentId: string;
    storageKey: string;
    userId: string;
  }): Promise<{
    jobId: string;
  }> {
    const job = await this.queue.add('process-document', input);

    return {
      jobId: String(job.id),
    };
  }

  public async close(): Promise<void> {
    await this.queue.close();
  }
}

export function createDocumentProcessingQueue(
  env: Pick<ApiEnv, 'REDIS_URL'>,
): DocumentProcessingQueue {
  return new BullMqDocumentProcessingQueue(env);
}

export function buildRedisConnectionOptions(redisUrlValue: string): {
  db?: number;
  host: string;
  password?: string;
  port: number;
  tls?: Record<string, never>;
  username?: string;
} {
  const redisUrl = new URL(redisUrlValue);
  const database = parseRedisDatabase(redisUrl.pathname);
  const password = redisUrl.password || undefined;
  const username = redisUrl.username || undefined;

  return {
    host: redisUrl.hostname,
    port: redisUrl.port === '' ? 6379 : Number.parseInt(redisUrl.port, 10),
    ...(database === undefined ? {} : { db: database }),
    ...(password === undefined ? {} : { password }),
    ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
    ...(username === undefined ? {} : { username }),
  };
}

function parseRedisDatabase(pathname: string): number | undefined {
  if (pathname === '' || pathname === '/') {
    return undefined;
  }

  const database = Number.parseInt(pathname.slice(1), 10);

  return Number.isNaN(database) ? undefined : database;
}
