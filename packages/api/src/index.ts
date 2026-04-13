import { buildApp } from './app.js';
import { loadApiEnv } from './config/env.js';

const env = loadApiEnv();
const app = await buildApp({ env });

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
