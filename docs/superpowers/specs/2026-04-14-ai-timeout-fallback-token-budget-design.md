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
interface AiCallSuccess<T> {
  ok: true;
  data: T;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

interface AiCallFailure {
  ok: false;
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

#### 3. The wrapper: `executeAiCall<T>()`

```ts
async function executeAiCall<T>(
  callType: AiCallType,
  callFn: (signal: AbortSignal) => Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }>,
): Promise<AiCallResult<T>>
```

Flow:

1. Look up config for `callType`
2. Create `AbortController` with `setTimeout` at `config.timeoutMs`
3. Call `callFn(signal)` — the caller adapts the SDK call to pass the signal and extract data + usage
4. On transient failure (network error, 502/503/504), retry once with fresh AbortController
5. On success, defensive check: if `usage.outputTokens > config.maxTokens`, return `{ ok: false, reason: 'budget_exceeded' }`
6. Log: `[AI_RUNTIME] ${config.label} | ${latencyMs}ms | ${usage.inputTokens}+${usage.outputTokens} tokens | ${outcome}`
7. Return typed result

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
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
});
if (!result.ok) return { concepts: [], prerequisites: [] };
return parseConceptGraphResponse(result.data);
```

Same pattern for atu-mapper, vision-client, and embedding-client.

### Logging format

```
[AI_RUNTIME] concept-analysis | 2340ms | 1200+3800 tokens | ok
[AI_RUNTIME] atu-extraction | 60000ms | 0+0 tokens | timeout
[AI_RUNTIME] embedding | 450ms | 0+0 tokens | ok
[AI_RUNTIME] vision-description | 29500ms | 200+45 tokens | transient_failure (retried, ok)
```

Includes `model` in structured log data for task 02 cost tracking. The `[AI_RUNTIME]` prefix makes grep/pipe trivial.

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
9. **Embedding skip** — verify budget check is skipped when `maxTokens` is 0

Tests for each refactored client:

10. **concept-analyzer** — verify it uses `executeAiCall` and preserves existing fallback (empty graph on failure)
11. **atu-mapper** — verify fallback to empty array on failure
12. **embedding-client** — verify timeout enforcement through wrapper
13. **vision-client** — verify fallback to null on failure

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
