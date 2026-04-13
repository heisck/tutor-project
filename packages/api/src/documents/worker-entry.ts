import { getPrismaClient } from '@ai-tutor-pwa/db';

import { loadApiEnv } from '../config/env.js';
import {
  createR2DocumentSourceStorageClient,
  createR2UploadStorageClient,
} from '../upload/storage/r2.js';
import { createDocxDocumentParserAdapter } from './docx-parser.js';
import { createPdfDocumentParserAdapter } from './pdf-parser.js';
import { createPptxDocumentParserAdapter } from './pptx-parser.js';
import { createVisionDescriptionClient } from './vision-client.js';
import { createDocumentWorkerEntryPoint } from './worker.js';

const env = loadApiEnv();
const prisma = getPrismaClient();

const worker = createDocumentWorkerEntryPoint({
  assetStorageClient: createR2UploadStorageClient(env),
  env,
  parserAdapters: [
    createPdfDocumentParserAdapter(),
    createPptxDocumentParserAdapter(),
    createDocxDocumentParserAdapter(),
  ],
  prisma,
  storageClient: createR2DocumentSourceStorageClient(env),
  visionClient: createVisionDescriptionClient(env.ANTHROPIC_API_KEY),
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void worker.close().finally(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
