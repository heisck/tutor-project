import OpenAI from 'openai';

export interface EmbeddingClient {
  generateEmbeddings(texts: readonly string[]): Promise<number[][]>;
}

export interface EmbeddingClientOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_TIMEOUT_MS = 30_000;
const BATCH_SIZE = 20;

export function createEmbeddingClient(options: EmbeddingClientOptions): EmbeddingClient {
  const client = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  const model = options.model ?? DEFAULT_MODEL;

  return {
    async generateEmbeddings(texts: readonly string[]): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }

      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const response = await client.embeddings.create({
          input: batch as string[],
          model,
        });

        const sorted = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);

        allEmbeddings.push(...sorted);
      }

      return allEmbeddings;
    },
  };
}
