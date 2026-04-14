# AI Timeout, Fallback, and Token Budget Enforcement

**Date:** 2026-04-14
**Fest task:** 008_RUNTIME_HARDENING / 01_guardrails_and_verification / 01_ai_timeout_fallback_and_token_budget_enforcement
**Status:** Design approved

## Problem

The 4 existing AI call sites each hardcode their own timeout and max_tokens values with inconsistent error handling. There is no centralized config, no structured failure classification, no retry for transient errors, and no token budget enforcement. A provider outage or runaway response can hang requests or produce silent failures.

## Scope

Harden the 4 existing AI call sites only:

| Call site | File | Provider | Current timeout | Current max_tokens |
|-----------|------|----------|-----------------|---------------------|
| concept-analysis | `knowledge/concept-analyzer.ts` | Anthropic Haiku 4.5 | 90s | 4096 |
| atu-extraction | `knowledge/atu-mapper.ts` | Anthropic Haiku 4.5 | 60s | 2048 |
| embedding | `knowledge/embedding-client.ts` | OpenAI | 30s | N/A |
| vision-description | `documents/vision-client.ts` | Anthropic Haiku 4.5 | 30s | 300 |

Out of scope (YAGNI):
- Tutor runtime paths (orchestrator, evaluation, assistant) do not call AI today
- Streaming support — no consumer exists yet
- Provider failover — no secondary provider configured
- Per-user quota/accounting — that is task 02 in this sequence
- Trace ID propagation — that is task 02

## Design

### New file: `packages/api/src/lib/ai-runtime.ts`

#### 1. Call type config registry

```ts
interface AiCallConfig {
  label: string;
  maxTokens: number;
  model: string;
  timeoutMs: number;
}

const AI_CALL_CONFIGS = {
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
    maxTokens: 0, // not applicable
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

type AiCallType = keyof typeof AI_CALL_CONFIGS;
```

All values match what the clients already use. Centralizing them makes policy changes single-point.

#### 2. Typed result union

```ts
interface AiCallUsage {
  inputTokens: number;
  outputTokens: number;
}

interface AiCallSuccess<T> {
  ok: true;
  attempt: 1 | 2;
  data: T;
  finishReason: string | null;
  latencyMs: number;
  usage: AiCallUsage | null; // null for embeddings
}

interface AiCallFailure {
  ok: false;
  attempt: 1 | 2;
  reason:
    | 'timeout'
    | 'transient_failure'
    | 'rate_limited'
    | 'budget_exceeded'
    | 'provider_error';
  message: string;
  retryAfterMs: number | null;
  latencyMs: number;
}

type AiCallResult<T> = AiCallSuccess<T> | AiCallFailure;
```

Each failure reason is semantically distinct so downstream code (and task 02) can react appropriately.

Design decisions on result shape:
- `usage` is nullable — embeddings have no output tokens, but the embedding client still returns `inputTokens` via `total_tokens` from the OpenAI response for task 02 cost tracking
- `finishReason` captures truncation vs clean stop vs refusal from the provider (null for embeddings)
- `attempt` tracks whether success came on first try or retry, visible in both success and failure results
- Zod validation of AI responses stays in the individual clients (concept-analyzer, atu-mapper) where domain schemas already exist — the wrapper stays provider-agnostic

#### 3. The wrapper: `executeAiCall<T>()`

```ts
async function executeAiCall<T>(
  callType: AiCallType,
  callFn: (signal: AbortSignal) => Promise<{
    data: T;
    finishReason: string | null;
    usage: AiCallUsage | null;
  }>,
): Promise<AiCallResult<T>>
```

Flow:

1. Look up config for `callType`
2. Start timer (`performance.now()`)
3. Execute loop (max 2 attempts):
   a. Create `AbortController` — use `AbortSignal.timeout()` where available, otherwise `setTimeout` + explicit cleanup in `finally` to prevent leaked listeners
   b. Call `callFn(signal)` — caller adapts SDK call to pass signal, extract data + usage + finishReason
   c. On success:
      - If `config.maxTokens > 0` and `usage.outputTokens > config.maxTokens`, return `{ ok: false, reason: 'budget_exceeded' }`
      - Return `{ ok: true, data, usage, finishReason, attempt }`
   d. On transient failure (network error, 502/503/504) and `attempt < 2`: wait jittered 100-300ms, then retry
   e. On any other error: classify, return failure immediately
4. Log: `[AI_RUNTIME] ${config.label} | attempt=${attempt} | ${latencyMs}ms | ${tokenSummary} | ${outcome}`
5. Return typed result

#### 4. Error classification

| Condition | Reason | Retry? |
|-----------|--------|--------|
| AbortSignal timeout | `timeout` | No |
| Network reset / ECONNREFUSED | `transient_failure` | Yes (once) |
| HTTP 502, 503, 504 | `transient_failure` | Yes (once) |
| HTTP 429 | `rate_limited` | No (surface `retryAfterMs`) |
| HTTP 400, 401, 403 | `provider_error` | No |
| Content policy refusal | `provider_error` | No |
| output tokens > maxTokens | `budget_exceeded` | No |

Strict retry eligibility: only network errors and 502/503/504. Everything else surfaces immediately.

#### 5. Token budget enforcement

The `maxTokens` from config is sent as the `max_tokens` parameter in the SDK call. This cuts generation off at the source (saves money). The wrapper's post-check on `usage.outputTokens` is a defensive backstop — it should rarely fire, but protects against SDK or provider bugs.

For embeddings, `maxTokens` is 0 and the budget check is skipped.

### Changes to existing clients

Each client gets refactored to:

1. Import `executeAiCall` and its call type config
2. Remove hardcoded timeout/max_tokens/model constants
3. Wrap the SDK call in a function that accepts `AbortSignal` and returns `{ data, usage }`
4. Handle the `AiCallResult` — on `ok: false`, use existing fallback behavior (return empty array, return null, etc.)

The external interface of each client does not change. Callers (pipeline functions) see the same return types.

#### concept-analyzer.ts changes

Before:
```ts
const client = new Anthropic({ apiKey, timeout: 90_000 });
const response = await client.messages.create({ max_tokens: 4096, ... });
// parse or return empty
```

After:
```ts
const client = new Anthropic({ apiKey });
const result = await executeAiCall('conceptAnalysis', async (signal) => {
  const response = await client.messages.create(
    { max_tokens: AI_CALL_CONFIGS.conceptAnalysis.maxTokens, ... },
    { signal },
  );
  return {
    data: response,
    finishReason: response.stop_reason ?? null,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
});
if (!result.ok) return { concepts: [], prerequisites: [] };
return parseConceptGraphResponse(result.data);
```

Same pattern for atu-mapper, vision-client, and embedding-client.

### Logging format

```
[AI_RUNTIME] concept-analysis | attempt=1 | 2340ms | 1200+3800 tokens | stop | ok
[AI_RUNTIME] atu-extraction | attempt=1 | 60000ms | timeout
[AI_RUNTIME] embedding | attempt=1 | 450ms | 820 input tokens | ok
[AI_RUNTIME] vision-description | attempt=2 | 29500ms | 200+45 tokens | stop | ok (retried)
```

- Attempt number on every line
- Embeddings show input tokens only (no output tokens, no finish reason)
- Finish reason included for generation calls (`stop`, `max_tokens`, `end_turn`)
- `model` included in structured log data for task 02 cost tracking
- `[AI_RUNTIME]` prefix makes grep/pipe trivial

### What does NOT change

- External client interfaces (return types, function signatures for callers)
- Pipeline logic in `generateConceptGraph`, `generateAtus`, etc.
- The tutor runtime (no AI calls there)
- Rate limiting (already handled at HTTP layer)
- Error handling in route handlers

## Testing

Tests for the new `ai-runtime.ts` module:

1. **Timeout enforcement** — mock a call that never resolves, verify `timeout` result within expected time
2. **Transient retry** — mock first call fails with 503, second succeeds, verify success result
3. **Retry exhaustion** — mock both attempts fail with 503, verify `transient_failure` result
4. **Rate limit surfacing** — mock 429 with retry-after header, verify `rate_limited` with correct `retryAfterMs`
5. **Budget exceeded** — mock response where `output_tokens > maxTokens`, verify `budget_exceeded` result
6. **Provider error passthrough** — mock 400/401/403, verify `provider_error` with no retry
7. **Success path** — mock clean response, verify `ok: true` with correct data and usage
8. **Logging output** — verify log format includes label, latency, tokens, outcome
9. **Embedding skip** — verify budget check is skipped when `maxTokens` is 0, usage returns `inputTokens` only
10. **Attempt tracking** — verify retry success returns `attempt: 2`, first-try success returns `attempt: 1`
11. **Finish reason passthrough** — verify `finishReason` from provider response appears in success result
12. **AbortSignal cleanup** — verify no leaked listeners after call completes (success and failure paths)

Tests for each refactored client:

13. **concept-analyzer** — verify it uses `executeAiCall` and preserves existing fallback (empty graph on failure)
14. **atu-mapper** — verify fallback to empty array on failure
15. **embedding-client** — verify timeout enforcement through wrapper, inputTokens captured
16. **vision-client** — verify fallback to null on failure

## Dependencies

- No new npm packages needed
- Anthropic SDK already supports `signal` in request options
- OpenAI SDK already supports `signal` via `AbortSignal`

## Risks

| Risk | Mitigation |
|------|------------|
| SDK signal support differs between providers | Verify both Anthropic and OpenAI SDK accept AbortSignal in tests |
| Retry masks real failures | Strict eligibility: only network + 502/503/504. Log every retry attempt |
| Budget check rarely fires since max_tokens enforces at source | That's the point — belt and suspenders. The check costs nothing |
