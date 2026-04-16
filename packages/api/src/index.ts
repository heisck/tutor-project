import { buildApp } from './app.js';
import { loadApiEnv } from './config/env.js';
import {
  DevInMemoryR2StorageClient,
  shouldUseDevStorage,
} from './dev-storage.js';

const env = loadApiEnv();

// Use in-memory storage for development if R2 is not properly configured
const uploadStorageClient = shouldUseDevStorage(env.R2_ENDPOINT)
  ? new DevInMemoryR2StorageClient()
  : undefined;

const app = await buildApp({
  env,
  ...(uploadStorageClient === undefined ? {} : { uploadStorageClient }),
});

try {
  await app.listen({
    host: '0.0.0.0',
    port: env.PORT,
  });
} catch (error) {
  app.log.error({ err: error }, 'API failed to start');
  process.exitCode = 1;
  await app.close();
}
