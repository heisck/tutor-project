import { getPrismaClient } from '@ai-tutor-pwa/db';

import { buildApp } from './app.js';
import { loadApiEnv } from './config/env.js';
import {
  DevInMemoryR2StorageClient,
  shouldUseDevStorage,
} from './dev-storage.js';
import { createAtuMapperClient } from './knowledge/atu-mapper.js';
import { createConceptAnalyzerClient } from './knowledge/concept-analyzer.js';
import { createEmbeddingClient } from './knowledge/embedding-client.js';
import {
  createR2DocumentSourceStorageClient,
  createR2UploadStorageClient,
} from './upload/storage/r2.js';
import { createDocxDocumentParserAdapter } from './documents/docx-parser.js';
import { createPdfDocumentParserAdapter } from './documents/pdf-parser.js';
import { createPptxDocumentParserAdapter } from './documents/pptx-parser.js';
import { createVisionDescriptionClient } from './documents/vision-client.js';
import { createDocumentWorkerEntryPoint } from './documents/worker.js';

const env = loadApiEnv();
const prisma = getPrismaClient();
const sharedDevStorageClient = shouldUseDevStorage(env.R2_ENDPOINT)
  ? new DevInMemoryR2StorageClient()
  : null;

const app = await buildApp({
  env,
  prismaClient: prisma,
  ...(sharedDevStorageClient === null
    ? {}
    : { uploadStorageClient: sharedDevStorageClient }),
});

const worker = createDocumentWorkerEntryPoint({
  assetStorageClient:
    sharedDevStorageClient ?? createR2UploadStorageClient(env),
  atuMapperClient: createAtuMapperClient(env.ANTHROPIC_API_KEY),
  conceptAnalyzerClient: createConceptAnalyzerClient(env.ANTHROPIC_API_KEY),
  embeddingClient: createEmbeddingClient({ apiKey: env.OPENAI_API_KEY }),
  env,
  parserAdapters: [
    createPdfDocumentParserAdapter(),
    createPptxDocumentParserAdapter(),
    createDocxDocumentParserAdapter(),
  ],
  prisma,
  storageClient:
    sharedDevStorageClient ?? createR2DocumentSourceStorageClient(env),
  visionClient: createVisionDescriptionClient(env.ANTHROPIC_API_KEY),
});

async function shutdown(): Promise<void> {
  await worker.close();
  await app.close();
  await prisma.$disconnect();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown().finally(() => {
      process.exit(0);
    });
  });
}

try {
  await app.listen({
    host: '0.0.0.0',
    port: env.PORT,
  });
} catch (error) {
  app.log.error({ err: error }, 'API failed to start');
  process.exitCode = 1;
  await shutdown();
}
