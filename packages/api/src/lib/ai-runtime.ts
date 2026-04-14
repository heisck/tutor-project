export interface AiCallConfig {
  label: string;
  maxTokens: number;
  model: string;
  timeoutMs: number;
}

export const AI_CALL_CONFIGS = {
  atuExtraction: {
    label: 'atu-extraction',
    maxTokens: 2048,
    model: 'claude-haiku-4-5-20251001',
    timeoutMs: 60_000,
  },
  conceptAnalysis: {
    label: 'concept-analysis',
    maxTokens: 4096,
    model: 'claude-haiku-4-5-20251001',
    timeoutMs: 90_000,
  },
  embedding: {
    label: 'embedding',
    maxTokens: 0,
    model: 'text-embedding-3-small',
    timeoutMs: 30_000,
  },
  visionDescription: {
    label: 'vision-description',
    maxTokens: 300,
    model: 'claude-haiku-4-5-20251001',
    timeoutMs: 30_000,
  },
} as const satisfies Record<string, AiCallConfig>;

export type AiCallType = keyof typeof AI_CALL_CONFIGS;


export interface AiCallUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AiCallSuccess<T> {
  ok: true;
  attempt: 1 | 2;
  data: T;
  finishReason: string | null;
  latencyMs: number;
  usage: AiCallUsage | null;
}

export type AiCallFailureReason =
  | 'timeout'
  | 'transient_failure'
  | 'rate_limited'
  | 'budget_exceeded'
  | 'provider_error';

export interface AiCallFailure {
  ok: false;
  attempt: 1 | 2;
  reason: AiCallFailureReason;
  message: string;
  retryAfterMs: number | null;
  latencyMs: number;
}

export type AiCallResult<T> = AiCallSuccess<T> | AiCallFailure;

export interface AiCallFnResult<T> {
  data: T;
  finishReason: string | null;
  usage: AiCallUsage | null;
}

interface HttpLikeError {
  status?: number;
  code?: string;
  name?: string;
  headers?: Record<string, string | string[] | undefined>;
}

function toHttpLike(error: unknown): HttpLikeError {
  if (error !== null && typeof error === 'object') {
    return error as HttpLikeError;
  }
  return {};
}

export function isTransientError(error: unknown): boolean {
  const e = toHttpLike(error);

  // HTTP 502 / 503 / 504
  if (e.status === 502 || e.status === 503 || e.status === 504) return true;

  // Network-level errors (fetch throws TypeError)
  if (error instanceof TypeError) return true;

  // Node socket errors
  if (
    e.code === 'ECONNRESET' ||
    e.code === 'ECONNREFUSED' ||
    e.code === 'ETIMEDOUT'
  )
    return true;

  return false;
}

export function isRateLimitError(error: unknown): boolean {
  const e = toHttpLike(error);
  return e.status === 429;
}

export function isAbortError(error: unknown): boolean {
  const e = toHttpLike(error);
  return (
    e.name === 'AbortError' ||
    e.name === 'APIUserAbortError' ||
    e.name === 'APIConnectionTimeoutError'
  );
}

export function extractRetryAfterMs(error: unknown): number | null {
  if (
    error === null ||
    typeof error !== 'object' ||
    !('headers' in error)
  ) {
    return null;
  }

  const headers = (error as { headers: unknown }).headers;

  // Both Anthropic and OpenAI SDKs use the web Headers class
  let raw: string | null = null;
  if (headers instanceof Headers) {
    raw = headers.get('retry-after');
  }

  if (raw === null) return null;

  // Could be seconds (numeric) or an HTTP-date
  const seconds = Number(raw);
  if (!isNaN(seconds) && seconds > 0) return Math.ceil(seconds * 1000);

  // HTTP-date fallback
  const date = new Date(raw);
  if (!isNaN(date.getTime())) {
    return Math.max(date.getTime() - Date.now(), 0);
  }

  return null;
}

export function classifyError(error: unknown): AiCallFailureReason {
  if (isAbortError(error)) return 'timeout';
  if (isRateLimitError(error)) return 'rate_limited';
  if (isTransientError(error)) return 'transient_failure';
  return 'provider_error';
}

export function jitteredDelay(): Promise<void> {
  const ms = 100 + Math.random() * 200; // 100–300 ms
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatUsage(usage: AiCallUsage | null): string {
  if (!usage) return 'tokens=n/a';
  return `in=${usage.inputTokens} out=${usage.outputTokens}`;
}

function logAiCall<T>(
  config: AiCallConfig,
  result: AiCallResult<T>,
  attempt: number,
): void {
  const prefix = `[AI_RUNTIME] ${config.label} | attempt=${attempt} | ${result.latencyMs}ms`;

  if (result.ok) {
    const usageStr = formatUsage(result.usage);
    const finish = result.finishReason ?? 'n/a';
    console.log(`${prefix} | ${usageStr} | finish=${finish} | OK`);
  } else {
    const retry =
      result.retryAfterMs !== null ? ` retry-after=${result.retryAfterMs}ms` : '';
    console.warn(
      `${prefix} | reason=${result.reason}${retry} | FAIL: ${result.message}`,
    );
  }
}

export async function executeAiCall<T>(
  callType: AiCallType,
  callFn: (signal: AbortSignal) => Promise<AiCallFnResult<T>>,
): Promise<AiCallResult<T>> {
  const config = AI_CALL_CONFIGS[callType];
  const start = performance.now();

  const MAX_ATTEMPTS = 2 as const;

  for (let attemptIdx = 0; attemptIdx < MAX_ATTEMPTS; attemptIdx++) {
    const attempt = (attemptIdx + 1) as 1 | 2;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(
      () => controller.abort(),
      config.timeoutMs,
    );

    try {
      const fnResult = await callFn(controller.signal);
      clearTimeout(timeoutHandle);

      const latencyMs = Math.round(performance.now() - start);

      // Token budget check
      if (
        config.maxTokens > 0 &&
        fnResult.usage !== null &&
        fnResult.usage.outputTokens > config.maxTokens
      ) {
        const failure: AiCallFailure = {
          ok: false,
          attempt,
          reason: 'budget_exceeded',
          message: `Output token count ${fnResult.usage.outputTokens} exceeds budget ${config.maxTokens}`,
          retryAfterMs: null,
          latencyMs,
        };
        logAiCall(config, failure, attempt);
        return failure;
      }

      const success: AiCallSuccess<T> = {
        ok: true,
        attempt,
        data: fnResult.data,
        finishReason: fnResult.finishReason,
        latencyMs,
        usage: fnResult.usage,
      };
      logAiCall(config, success, attempt);
      return success;
    } catch (error: unknown) {
      clearTimeout(timeoutHandle);

      const latencyMs = Math.round(performance.now() - start);
      const isAbort = isAbortError(error);
      const isTransient = !isAbort && isTransientError(error);

      // Retry only transient errors on first attempt
      if (isTransient && attempt < MAX_ATTEMPTS) {
        await jitteredDelay();
        continue;
      }

      const reason = classifyError(error);
      const message =
        error instanceof Error ? error.message : String(error);
      const retryAfterMs = isRateLimitError(error)
        ? extractRetryAfterMs(error)
        : null;

      const failure: AiCallFailure = {
        ok: false,
        attempt,
        reason,
        message,
        retryAfterMs,
        latencyMs,
      };
      logAiCall(config, failure, attempt);
      return failure;
    }
  }

  // Loop exhausted (both attempts hit transient errors)
  const latencyMs = Math.round(performance.now() - start);
  const exhausted: AiCallFailure = {
    ok: false,
    attempt: MAX_ATTEMPTS,
    reason: 'transient_failure',
    message: 'All retry attempts exhausted due to transient failures',
    retryAfterMs: null,
    latencyMs,
  };
  logAiCall(config, exhausted, MAX_ATTEMPTS);
  return exhausted;
}
