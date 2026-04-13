export const APP_NAME = 'ai-tutor-pwa';

export const HEALTH_PATHS = {
  root: '/health',
  db: '/health/db',
  redis: '/health/redis',
} as const;

export interface HealthResponse {
  app: typeof APP_NAME;
  status: 'ok';
  timestamp: string;
  version: string;
}

export interface ServiceHealthResponse {
  service: 'database' | 'redis';
  status: 'ok' | 'error';
  timestamp: string;
}
