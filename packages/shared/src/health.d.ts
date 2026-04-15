export declare const APP_NAME = "ai-tutor-pwa";
export declare const HEALTH_PATHS: {
    readonly root: "/health";
    readonly db: "/health/db";
    readonly redis: "/health/redis";
};
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
//# sourceMappingURL=health.d.ts.map