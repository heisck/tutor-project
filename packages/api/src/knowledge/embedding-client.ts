import { GoogleGenAI } from '@google/genai';

import { AI_CALL_CONFIGS, executeAiCall } from '../lib/ai-runtime.js';

export interface EmbeddingClient {
  generateEmbeddings(texts: readonly string[]): Promise<number[][]>;
}

export interface EmbeddingClientOptions {
  apiKey: string;
  model?: string;
}

const BATCH_SIZE = 20;
const EMBEDDING_DIMENSIONS = 1536;

export function createEmbeddingClient(options: EmbeddingClientOptions): EmbeddingClient {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
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
          const response = await ai.models.embedContent({
            contents: [...batch],
            config: {
              abortSignal: signal,
              autoTruncate: true,
              outputDimensionality: EMBEDDING_DIMENSIONS,
              taskType: 'RETRIEVAL_DOCUMENT',
            },
            model,
          });

          const embeddings = (response.embeddings ?? []).map((e) => {
            if (!e.values) {
              throw new Error('Gemini returned an embedding with no values');
            }
            return e.values;
          });

          return {
            data: embeddings,
            finishReason: null,
            usage: {
              // The Gemini embedding response type does not expose token usage metadata.
              inputTokens: 0,
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
