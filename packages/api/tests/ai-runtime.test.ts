import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AI_CALL_CONFIGS,
  executeAiCall,
  type AiCallFnResult,
} from '../src/lib/ai-runtime.js';
import * as structuredLog from '../src/lib/structured-log.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHttpError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function make429Error(retryAfterSeconds?: number): Error & { status: number; headers: Headers } {
  const err = new Error('Rate limited') as Error & { status: number; headers: Headers };
  err.status = 429;
  err.headers = new Headers();
  if (retryAfterSeconds !== undefined) {
    err.headers.set('retry-after', String(retryAfterSeconds));
  }
  return err;
}

function makeSuccess<T>(data: T, outputTokens = 10): AiCallFnResult<T> {
  return {
    data,
    finishReason: 'end_turn',
    usage: { inputTokens: 5, outputTokens },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('executeAiCall', () => {
  it('success path — returns ok:true with data, usage, finishReason, attempt=1, latencyMs>=0', async () => {
    const callFn = vi.fn().mockResolvedValue(makeSuccess({ answer: 42 }));

    const result = await executeAiCall('conceptAnalysis', callFn);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.attempt).toBe(1);
    expect(result.data).toEqual({ answer: 42 });
    expect(result.finishReason).toBe('end_turn');
    expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 10 });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('transient retry success — first call throws 503, second succeeds; attempt=2', async () => {
    const callFn = vi
      .fn()
      .mockRejectedValueOnce(makeHttpError(503, 'Service Unavailable'))
      .mockResolvedValueOnce(makeSuccess('ok'));

    // Suppress jitteredDelay by mocking setTimeout to fire instantly
    vi.useFakeTimers();
    const promise = executeAiCall('atuExtraction', callFn);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempt).toBe(2);
  });

  it('transient retry exhaustion — every attempt throws 503; reason=transient_failure, attempt=4', async () => {
    const callFn = vi
      .fn()
      .mockRejectedValue(makeHttpError(503, 'Service Unavailable'));

    vi.useFakeTimers();
    const promise = executeAiCall('atuExtraction', callFn);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('transient_failure');
    expect(result.attempt).toBe(4);
  });

  it('timeout enforcement — a never-resolving call returns a timeout failure within the configured budget', async () => {
    vi.useFakeTimers();
    const callFn = vi
      .fn<(signal: AbortSignal) => Promise<AiCallFnResult<string>>>()
      .mockImplementation(() => new Promise<AiCallFnResult<string>>(() => {}));

    const promise = executeAiCall('visionDescription', callFn);
    await vi.advanceTimersByTimeAsync(AI_CALL_CONFIGS.visionDescription.timeoutMs);
    const result = await promise;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('timeout');
    expect(result.attempt).toBe(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(
      AI_CALL_CONFIGS.visionDescription.timeoutMs,
    );
  });

  it('rate limit surfacing — 429 retries with retry-after backoff, eventually fails with rate_limited reason', async () => {
    const callFn = vi.fn().mockRejectedValue(make429Error(30));

    vi.useFakeTimers();
    const promise = executeAiCall('conceptAnalysis', callFn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('rate_limited');
    expect(result.attempt).toBe(4);
    expect(result.retryAfterMs).toBe(30_000);
    // All 4 attempts exhausted
    expect(callFn).toHaveBeenCalledTimes(4);
  });

  it('rate limit without header — retryAfterMs is null', async () => {
    const callFn = vi.fn().mockRejectedValue(make429Error());

    vi.useFakeTimers();
    const promise = executeAiCall('conceptAnalysis', callFn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('rate_limited');
    expect(result.retryAfterMs).toBeNull();
  });

  it('provider error no retry — 400 error; reason=provider_error, attempt=1, callFn called once', async () => {
    const callFn = vi.fn().mockRejectedValue(makeHttpError(400, 'Bad Request'));

    const result = await executeAiCall('conceptAnalysis', callFn);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('provider_error');
    expect(result.attempt).toBe(1);
    expect(callFn).toHaveBeenCalledTimes(1);
  });

  it('budget exceeded — outputTokens > maxTokens for conceptAnalysis (4096); reason=budget_exceeded with counts in message', async () => {
    const overBudgetTokens = AI_CALL_CONFIGS.conceptAnalysis.maxTokens + 1; // 4097
    const callFn = vi.fn().mockResolvedValue({
      data: 'big response',
      finishReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: overBudgetTokens },
    } satisfies AiCallFnResult<string>);

    const result = await executeAiCall('conceptAnalysis', callFn);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('budget_exceeded');
    expect(result.message).toContain(String(overBudgetTokens));
    expect(result.message).toContain(String(AI_CALL_CONFIGS.conceptAnalysis.maxTokens));
  });

  it('budget skip for embeddings — any token count; ok:true (maxTokens=0 skips budget check)', async () => {
    const callFn = vi.fn().mockResolvedValue({
      data: [0.1, 0.2, 0.3],
      finishReason: null,
      usage: { inputTokens: 50, outputTokens: 99999 },
    } satisfies AiCallFnResult<number[]>);

    const result = await executeAiCall('embedding', callFn);

    expect(result.ok).toBe(true);
  });

  it('finish reason passthrough — finishReason appears in success result', async () => {
    const callFn = vi.fn().mockResolvedValue({
      data: 'truncated',
      finishReason: 'max_tokens',
      usage: null,
    } satisfies AiCallFnResult<string>);

    const result = await executeAiCall('visionDescription', callFn);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finishReason).toBe('max_tokens');
  });

  it('null usage — ok:true with usage:null', async () => {
    const callFn = vi.fn().mockResolvedValue({
      data: 'hello',
      finishReason: 'end_turn',
      usage: null,
    } satisfies AiCallFnResult<string>);

    const result = await executeAiCall('atuExtraction', callFn);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usage).toBeNull();
  });

  it('network error retry — first call throws TypeError(fetch failed), second succeeds; ok:true, attempt=2', async () => {
    const callFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(makeSuccess('recovered'));

    vi.useFakeTimers();
    const promise = executeAiCall('atuExtraction', callFn);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempt).toBe(2);
  });

  it('logging output includes label, model, latency, token usage, and outcome', async () => {
    const structuredLogSpy = vi
      .spyOn(structuredLog, 'writeStructuredLog')
      .mockImplementation(() => {});

    const successResult = await executeAiCall(
      'conceptAnalysis',
      vi.fn().mockResolvedValue(makeSuccess('ok')),
    );
    const failureResult = await executeAiCall(
      'atuExtraction',
      vi.fn().mockRejectedValue(makeHttpError(400, 'Bad Request')),
    );

    expect(successResult.ok).toBe(true);
    expect(failureResult.ok).toBe(false);
    expect(structuredLogSpy).toHaveBeenCalledTimes(2);
    expect(structuredLogSpy).toHaveBeenNthCalledWith(
      1,
      'info',
      'ai_runtime_call',
      expect.objectContaining({
        finishReason: 'end_turn',
        label: 'concept-analysis',
        model: AI_CALL_CONFIGS.conceptAnalysis.model,
        outcome: 'ok',
        usage: 'in=5 out=10',
      }),
    );
    expect(structuredLogSpy).toHaveBeenNthCalledWith(
      2,
      'warn',
      'ai_runtime_call',
      expect.objectContaining({
        label: 'atu-extraction',
        model: AI_CALL_CONFIGS.atuExtraction.model,
        outcome: 'failed',
        reason: 'provider_error',
      }),
    );
  });

  it('cleans up abort listeners after a successful call', async () => {
    const originalAddEventListener = AbortSignal.prototype.addEventListener;
    const originalRemoveEventListener = AbortSignal.prototype.removeEventListener;
    let addedAbortListeners = 0;
    let removedAbortListeners = 0;

    vi.spyOn(AbortSignal.prototype, 'addEventListener').mockImplementation(
      function patchedAddEventListener(
        this: AbortSignal,
        type,
        listener,
        options,
      ) {
        if (type === 'abort') {
          addedAbortListeners++;
        }

        return originalAddEventListener.call(this, type, listener, options);
      },
    );
    vi.spyOn(AbortSignal.prototype, 'removeEventListener').mockImplementation(
      function patchedRemoveEventListener(
        this: AbortSignal,
        type,
        listener,
        options,
      ) {
        if (type === 'abort') {
          removedAbortListeners++;
        }

        return originalRemoveEventListener.call(this, type, listener, options);
      },
    );

    const result = await executeAiCall(
      'embedding',
      vi.fn().mockResolvedValue({
        data: [0.2, 0.4],
        finishReason: null,
        usage: { inputTokens: 9, outputTokens: 0 },
      } satisfies AiCallFnResult<number[]>),
    );

    expect(result.ok).toBe(true);
    expect(addedAbortListeners).toBeGreaterThan(0);
    expect(removedAbortListeners).toBeGreaterThanOrEqual(addedAbortListeners);
  });

  it('cleans up abort listeners after a timeout failure', async () => {
    const originalAddEventListener = AbortSignal.prototype.addEventListener;
    const originalRemoveEventListener = AbortSignal.prototype.removeEventListener;
    let addedAbortListeners = 0;
    let removedAbortListeners = 0;

    vi.spyOn(AbortSignal.prototype, 'addEventListener').mockImplementation(
      function patchedAddEventListener(
        this: AbortSignal,
        type,
        listener,
        options,
      ) {
        if (type === 'abort') {
          addedAbortListeners++;
        }

        return originalAddEventListener.call(this, type, listener, options);
      },
    );
    vi.spyOn(AbortSignal.prototype, 'removeEventListener').mockImplementation(
      function patchedRemoveEventListener(
        this: AbortSignal,
        type,
        listener,
        options,
      ) {
        if (type === 'abort') {
          removedAbortListeners++;
        }

        return originalRemoveEventListener.call(this, type, listener, options);
      },
    );

    vi.useFakeTimers();
    const promise = executeAiCall(
      'embedding',
      vi
        .fn<(signal: AbortSignal) => Promise<AiCallFnResult<number[]>>>()
        .mockImplementation(() => new Promise<AiCallFnResult<number[]>>(() => {})),
    );
    await vi.advanceTimersByTimeAsync(AI_CALL_CONFIGS.embedding.timeoutMs);
    const result = await promise;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('timeout');
    expect(addedAbortListeners).toBeGreaterThan(0);
    expect(removedAbortListeners).toBeGreaterThanOrEqual(addedAbortListeners);
  });
});
