import OpenAI from 'openai';

import { AI_CALL_CONFIGS, executeAiCall } from '../lib/ai-runtime.js';

export interface EmbeddingClient {
  generateEmbeddings(texts: readonly string[]): Promise<number[][]>;
}

export interface EmbeddingClientOptions {
  apiKey: string;
  model?: string;
}

const BATCH_SIZE = 20;

export function createEmbeddingClient(options: EmbeddingClientOptions): EmbeddingClient {
  const client = new OpenAI({
    apiKey: options.apiKey,
  });

  const model = options.model ?? AI_CALL_CONFIGS.embedding.model;

  return {
    async generateEmbeddings(texts: readonly string[]): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }

      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const result = await executeAiCall('embedding', async (signal) => {
          const response = await client.embeddings.create(
            {
              input: [...batch],
              model,
            },
            { signal },
          );

          return {
            data: response.data
              .sort((a, b) => a.index - b.index)
              .map((item) => item.embedding),
            finishReason: null,
            usage: {
              inputTokens: response.usage.total_tokens,
              outputTokens: 0,
            },
          };
        });

        if (!result.ok) {
          throw new Error(
            `Embedding request failed (${result.reason}): ${result.message}`,
          );
        }

        allEmbeddings.push(...result.data);
      }

      return allEmbeddings;
    },
  };
}
