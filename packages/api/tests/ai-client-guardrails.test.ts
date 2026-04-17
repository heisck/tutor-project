import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdkMocks = vi.hoisted(() => {
  const anthropicMessagesCreate = vi.fn();
  const anthropicConstructor = vi.fn();
  function MockAnthropic(...args: unknown[]) {
    anthropicConstructor(...args);
    return {
      messages: {
        create: anthropicMessagesCreate,
      },
    };
  }
  const googleEmbedContent = vi.fn();
  const googleGenerateContent = vi.fn();
  const googleConstructor = vi.fn();
  function MockGoogleGenAI(...args: unknown[]) {
    googleConstructor(...args);
    return {
      models: {
        embedContent: googleEmbedContent,
        generateContent: googleGenerateContent,
      },
    };
  }

  return {
    anthropicConstructor,
    anthropicMessagesCreate,
    googleConstructor,
    googleEmbedContent,
    googleGenerateContent,
    MockAnthropic,
    MockGoogleGenAI,
  };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: sdkMocks.MockAnthropic,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: sdkMocks.MockGoogleGenAI,
}));

import { createVisionDescriptionClient } from '../src/documents/vision-client.js';
import { AI_CALL_CONFIGS } from '../src/lib/ai-runtime.js';
import { createAtuMapperClient } from '../src/knowledge/atu-mapper.js';
import { createConceptAnalyzerClient } from '../src/knowledge/concept-analyzer.js';
import { createEmbeddingClient } from '../src/knowledge/embedding-client.js';

describe('AI client guardrails', () => {
  beforeEach(() => {
    sdkMocks.anthropicConstructor.mockClear();
    sdkMocks.anthropicMessagesCreate.mockReset();
    sdkMocks.googleConstructor.mockClear();
    sdkMocks.googleEmbedContent.mockReset();
    sdkMocks.googleGenerateContent.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('concept analyzer uses centralized config, forwards AbortSignal, and parses a successful response', async () => {
    sdkMocks.anthropicMessagesCreate.mockImplementationOnce(
      async (payload: Record<string, unknown>, options: Record<string, unknown>) => {
        expect(payload.model).toBe(AI_CALL_CONFIGS.conceptAnalysis.model);
        expect(payload.max_tokens).toBe(AI_CALL_CONFIGS.conceptAnalysis.maxTokens);
        expect(options.signal).toBeInstanceOf(AbortSignal);

        return {
          content: [
            {
              text: JSON.stringify({
                concepts: [
                  {
                    atuIds: ['atu-1'],
                    description: 'How cells divide.',
                    misconceptions: [],
                    title: 'Mitosis',
                  },
                ],
                prerequisites: [],
              }),
              type: 'text',
            },
          ],
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 18,
            output_tokens: 42,
          },
        };
      },
    );

    const client = createConceptAnalyzerClient('anthropic-key');
    const result = await client.analyzeConceptGraph({
      atus: [
        {
          category: 'concept',
          content: 'Mitosis is a form of cell division.',
          id: 'atu-1',
          title: 'Mitosis',
        },
      ],
    });

    expect(result).toEqual({
      concepts: [
        {
          atuIds: ['atu-1'],
          description: 'How cells divide.',
          misconceptions: [],
          title: 'Mitosis',
        },
      ],
      prerequisites: [],
    });
  });

  it('concept analyzer returns an empty graph when the provider path fails', async () => {
    sdkMocks.anthropicMessagesCreate.mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { status: 400 }),
    );

    const client = createConceptAnalyzerClient('anthropic-key');
    const result = await client.analyzeConceptGraph({
      atus: [
        {
          category: 'concept',
          content: 'Cells are the basic unit of life.',
          id: 'atu-1',
          title: 'Cells',
        },
      ],
    });

    expect(result).toEqual({ concepts: [], prerequisites: [] });
  });

  it('ATU mapper returns an empty map when the provider path fails', async () => {
    sdkMocks.googleGenerateContent.mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { status: 400 }),
    );

    const client = createAtuMapperClient('gemini-key');
    const result = await client.extractAtusBatch([
      {
        category: 'text',
        content: 'A textbook excerpt about photosynthesis.',
        title: 'Photosynthesis',
        unitId: 'unit-1',
      },
    ]);

    expect(result.size).toBe(0);
  });

  it('embedding client uses centralized config, forwards AbortSignal, and preserves embedding order', async () => {
    sdkMocks.googleEmbedContent.mockImplementationOnce(
      async (payload: Record<string, unknown>) => {
        expect(payload.model).toBe(AI_CALL_CONFIGS.embedding.model);
        expect(payload.config).toMatchObject({
          outputDimensionality: 1536,
          taskType: 'RETRIEVAL_DOCUMENT',
        });
        expect((payload.config as { abortSignal: AbortSignal }).abortSignal).toBeInstanceOf(AbortSignal);

        return {
          embeddings: [
            {
              values: [0.1, 0.2],
            },
            {
              values: [0.3, 0.4],
            },
          ],
        };
      },
    );

    const client = createEmbeddingClient({ apiKey: 'gemini-key' });
    const result = await client.generateEmbeddings(['alpha', 'beta']);

    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it('embedding client times out through the wrapper and throws a bounded failure', async () => {
    vi.useFakeTimers();
    sdkMocks.googleEmbedContent.mockImplementationOnce(
      () => new Promise(() => {}),
    );

    const client = createEmbeddingClient({ apiKey: 'gemini-key' });
    const promise = client.generateEmbeddings(['alpha']);
    const rejection = expect(promise).rejects.toThrow(
      'Embedding request failed (timeout)',
    );

    await vi.advanceTimersByTimeAsync(AI_CALL_CONFIGS.embedding.timeoutMs);
    await rejection;
  });

  it('vision client returns null when the provider path fails', async () => {
    sdkMocks.googleGenerateContent.mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { status: 400 }),
    );

    const client = createVisionDescriptionClient('gemini-key');
    const result = await client.describeAsset({
      buffer: Buffer.from('image-bytes'),
      kind: 'image',
      mimeType: 'image/png',
      sourceTrace: {
        format: 'pptx',
        headingPath: [],
        sourceId: 'pptx:media:image-1',
      },
    });

    expect(result).toBeNull();
  });
});
