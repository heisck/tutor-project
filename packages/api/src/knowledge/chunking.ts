import { encodingForModel } from 'js-tiktoken';

export interface ChunkInput {
  content: string;
  sourceTrace: unknown;
  sourceUnitId: string;
}

export interface Chunk {
  content: string;
  sourceTrace: unknown;
  sourceUnitId: string;
  tokenCount: number;
}

export interface ChunkingOptions {
  maxTokens: number;
  overlapTokens: number;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxTokens: 512,
  overlapTokens: 50,
};

let cachedEncoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder() {
  if (cachedEncoder === null) {
    cachedEncoder = encodingForModel('text-embedding-3-small');
  }
  return cachedEncoder;
}

export function chunkSourceUnits(
  units: readonly ChunkInput[],
  options: ChunkingOptions = DEFAULT_OPTIONS,
): Chunk[] {
  const chunks: Chunk[] = [];

  for (const unit of units) {
    const unitChunks = chunkText(unit.content, options);
    for (const text of unitChunks) {
      chunks.push({
        content: text.content,
        sourceTrace: unit.sourceTrace,
        sourceUnitId: unit.sourceUnitId,
        tokenCount: text.tokenCount,
      });
    }
  }

  return chunks;
}

function chunkText(
  text: string,
  options: ChunkingOptions,
): Array<{ content: string; tokenCount: number }> {
  const encoder = getEncoder();
  const tokens = encoder.encode(text);

  if (tokens.length <= options.maxTokens) {
    return [{ content: text, tokenCount: tokens.length }];
  }

  const results: Array<{ content: string; tokenCount: number }> = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(start + options.maxTokens, tokens.length);
    const slice = tokens.slice(start, end);
    const decoded = encoder.decode(slice);

    results.push({ content: decoded, tokenCount: slice.length });

    if (end >= tokens.length) {
      break;
    }

    start = end - options.overlapTokens;
  }

  return results;
}

export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}
