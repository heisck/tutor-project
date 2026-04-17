import { writeStructuredLog } from './structured-log.js';

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
    model: 'gemini-2.5-flash',
    timeoutMs: 60_000,
  },
  conceptAnalysis: {
    label: 'concept-analysis',
    maxTokens: 8192,
    model: 'claude-haiku-4-5-20251001',
    timeoutMs: 120_000,
  },
  embedding: {
    label: 'embedding',
    maxTokens: 0,
    model: 'gemini-embedding-001',
    timeoutMs: 30_000,
  },
  tutorAssistant: {
    label: 'tutor-assistant',
    maxTokens: 1024,
    model: 'claude-haiku-4-5-20251001',
    timeoutMs: 45_000,
  },
  tutorEvaluation: {
    label: 'tutor-evaluation',
    maxTokens: 1024,
    model: 'claude-haiku-4-5-20251001',
    timeoutMs: 45_000,
  },
  tutorGeneration: {
    label: 'tutor-generation',
    maxTokens: 1024,
    model: 'claude-haiku-4-5-20251001',
    timeoutMs: 45_000,
  },
  visionDescription: {
    label: 'vision-description',
    maxTokens: 300,
    model: 'gemini-2.5-flash',
    timeoutMs: 30_000,
  },
  voiceSynthesis: {
    label: 'voice-synthesis',
    maxTokens: 0,
    model: 'gpt-4o-mini-tts',
    timeoutMs: 45_000,
  },
  voiceTranscription: {
    label: 'voice-transcription',
    maxTokens: 0,
    model: 'gpt-4o-mini-transcribe',
    timeoutMs: 45_000,
  },
} as const satisfies Record<string, AiCallConfig>;

export type AiCallType = keyof typeof AI_CALL_CONFIGS;

export interface AiCallUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AiCallSuccess<T> {
  ok: true;
  attempt: 1 | 2 | 3 | 4;
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
  attempt: 1 | 2 | 3 | 4;
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
  message?: string;
  details?: unknown;
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

function parseRetryAfterRaw(raw: string | null): number | null {
  if (raw === null) return null;

  const trimmed = raw.trim();

  // Could be seconds (numeric) or an HTTP-date
  const seconds = Number(trimmed);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const delayMatch = trimmed.match(/(\d+(?:\.\d+)?)s\b/i);
  if (delayMatch?.[1] !== undefined) {
    const delaySeconds = Number(delayMatch[1]);
    if (!Number.isNaN(delaySeconds) && delaySeconds > 0) {
      return Math.ceil(delaySeconds * 1000);
    }
  }

  // HTTP-date fallback
  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(date.getTime() - Date.now(), 0);
  }

  return null;
}

function extractRetryAfterFromGoogleDetails(details: unknown): number | null {
  if (!Array.isArray(details)) {
    return null;
  }

  for (const detail of details) {
    if (detail === null || typeof detail !== 'object') {
      continue;
    }

    const retryDelay = (detail as { retryDelay?: unknown }).retryDelay;
    if (typeof retryDelay === 'string') {
      const parsed = parseRetryAfterRaw(retryDelay);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

export function extractRetryAfterMs(error: unknown): number | null {
  if (error === null || typeof error !== 'object') {
    return null;
  }

  const candidate = error as HttpLikeError;
  const headers = ('headers' in candidate ? candidate.headers : undefined) as unknown;

  // Anthropic/OpenAI typically expose a web Headers class.
  if (headers instanceof Headers) {
    const parsed = parseRetryAfterRaw(headers.get('retry-after'));
    if (parsed !== null) {
      return parsed;
    }
  }

  // Some SDKs expose plain-object headers.
  if (headers !== null && typeof headers === 'object') {
    const retryAfter = (headers as Record<string, unknown>)['retry-after'];
    if (typeof retryAfter === 'string') {
      const parsed = parseRetryAfterRaw(retryAfter);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  // Gemini often puts retry information in structured error details.
  const detailsRetryAfter = extractRetryAfterFromGoogleDetails(candidate.details);
  if (detailsRetryAfter !== null) {
    return detailsRetryAfter;
  }

  // As a final fallback, try to parse "Please retry in 49.1s" from the message.
  if (typeof candidate.message === 'string') {
    const parsed = parseRetryAfterRaw(candidate.message);
    if (parsed !== null) {
      return parsed;
    }
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

function createAbortError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError');
  }

  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function normalizeAbortReason(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }

  return createAbortError('The operation was aborted.');
}

function createTimedAbortSignal(timeoutMs: number): {
  abortPromise: Promise<never>;
  cleanup: () => void;
  signal: AbortSignal;
} {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = setTimeout(
    () =>
      controller.abort(
        createAbortError(`AI call timed out after ${timeoutMs}ms.`),
      ),
    timeoutMs,
  );
  let abortHandler: (() => void) | null = null;

  const abortPromise = new Promise<never>((_, reject) => {
    abortHandler = () => {
      reject(normalizeAbortReason(controller.signal.reason));
    };
    controller.signal.addEventListener('abort', abortHandler, { once: true });
  });

  return {
    abortPromise,
    cleanup: () => {
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      if (abortHandler !== null) {
        controller.signal.removeEventListener('abort', abortHandler);
        abortHandler = null;
      }
    },
    signal: controller.signal,
  };
}

function logAiCall<T>(
  config: AiCallConfig,
  result: AiCallResult<T>,
  attempt: number,
): void {
  if (result.ok) {
    writeStructuredLog('info', 'ai_runtime_call', {
      attempt,
      finishReason: result.finishReason ?? 'n/a',
      label: config.label,
      latencyMs: result.latencyMs,
      maxTokens: config.maxTokens,
      model: config.model,
      outcome: 'ok',
      usage: formatUsage(result.usage),
    });
  } else {
    writeStructuredLog('warn', 'ai_runtime_call', {
      attempt,
      label: config.label,
      latencyMs: result.latencyMs,
      maxTokens: config.maxTokens,
      message: result.message,
      model: config.model,
      outcome: 'failed',
      reason: result.reason,
      retryAfterMs: result.retryAfterMs,
    });
  }
}

const MAX_RATE_LIMIT_WAIT_MS = 60_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeAiCall<T>(
  callType: AiCallType,
  callFn: (signal: AbortSignal) => Promise<AiCallFnResult<T>>,
): Promise<AiCallResult<T>> {
  const config = AI_CALL_CONFIGS[callType];
  const start = performance.now();

  const MAX_ATTEMPTS = 4 as const;
  let lastRateLimitRetryAfter: number | null = null;

  for (let attemptIdx = 0; attemptIdx < MAX_ATTEMPTS; attemptIdx++) {
    const attempt = (attemptIdx + 1) as 1 | 2 | 3 | 4;
    const { abortPromise, cleanup, signal } =
      createTimedAbortSignal(config.timeoutMs);

    try {
      const fnResult = await Promise.race([callFn(signal), abortPromise]);

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
      const latencyMs = Math.round(performance.now() - start);
      const isAbort = isAbortError(error);
      const isTransient = !isAbort && isTransientError(error);
      const isRateLimited = isRateLimitError(error);
      const canRetry = attempt < MAX_ATTEMPTS;

      if (isRateLimited && canRetry) {
        // Respect server-sent retry-after. Cap so we don't block forever.
        const serverRetryMs = extractRetryAfterMs(error);
        lastRateLimitRetryAfter = serverRetryMs;
        const waitMs = Math.min(
          serverRetryMs ?? 1000 * 2 ** attemptIdx,
          MAX_RATE_LIMIT_WAIT_MS,
        );
        await sleep(waitMs + Math.floor(Math.random() * 200));
        continue;
      }

      if (isTransient && canRetry) {
        const transientWaitMs = 750 * 2 ** attemptIdx + Math.floor(Math.random() * 250);
        await sleep(transientWaitMs);
        continue;
      }

      const reason = classifyError(error);
      const message =
        error instanceof Error ? error.message : String(error);
      const retryAfterMs = isRateLimited
        ? extractRetryAfterMs(error)
        : lastRateLimitRetryAfter;

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
    } finally {
      cleanup();
    }
  }

  const latencyMs = Math.round(performance.now() - start);
  const exhausted: AiCallFailure = {
    ok: false,
    attempt: MAX_ATTEMPTS,
    reason: 'transient_failure',
    message: 'All retry attempts exhausted',
    retryAfterMs: lastRateLimitRetryAfter,
    latencyMs,
  };
  logAiCall(config, exhausted, MAX_ATTEMPTS);
  return exhausted;
}
