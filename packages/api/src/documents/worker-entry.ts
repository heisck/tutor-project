import { getPrismaClient } from '@ai-tutor-pwa/db';

import { loadApiEnv } from '../config/env.js';
import { createR2DocumentSourceStorageClient } from '../upload/storage/r2.js';
import { createDocumentWorkerEntryPoint } from './worker.js';

const env = loadApiEnv();
const prisma = getPrismaClient();

const worker = createDocumentWorkerEntryPoint({
  env,
  parserAdapters: [],
  prisma,
  storageClient: createR2DocumentSourceStorageClient(env),
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void worker.close().finally(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
