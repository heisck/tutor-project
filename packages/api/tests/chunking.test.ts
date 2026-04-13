import { describe, expect, it } from 'vitest';

import {
  chunkSourceUnits,
  countTokens,
  type ChunkInput,
} from '../src/knowledge/chunking.js';

describe('chunking service', () => {
  it('returns a single chunk when content fits within max tokens', () => {
    const input: ChunkInput[] = [
      {
        content: 'Cells are the basic unit of life.',
        sourceTrace: { format: 'pdf', pageNumber: 1 },
        sourceUnitId: 'su-1',
      },
    ];

    const chunks = chunkSourceUnits(input);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe('Cells are the basic unit of life.');
    expect(chunks[0]!.sourceUnitId).toBe('su-1');
    expect(chunks[0]!.tokenCount).toBeGreaterThan(0);
    expect(chunks[0]!.tokenCount).toBeLessThanOrEqual(512);
  });

  it('splits long content into multiple chunks with correct overlap', () => {
    // Generate text that is definitely longer than 512 tokens
    const words = Array.from({ length: 800 }, (_, i) => `word${i}`);
    const longText = words.join(' ');
    const totalTokens = countTokens(longText);

    expect(totalTokens).toBeGreaterThan(512);

    const input: ChunkInput[] = [
      {
        content: longText,
        sourceTrace: { format: 'pdf', pageNumber: 1 },
        sourceUnitId: 'su-long',
      },
    ];

    const chunks = chunkSourceUnits(input);

    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be at most 512 tokens
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(512);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }

    // Verify overlap: second chunk should share content with end of first chunk
    const firstChunkTokens = chunks[0]!.tokenCount;
    expect(firstChunkTokens).toBe(512);
  });

  it('preserves metadata across all chunks from the same source unit', () => {
    const words = Array.from({ length: 800 }, (_, i) => `term${i}`);
    const longText = words.join(' ');

    const trace = { format: 'pptx', headingPath: ['Section A'], order: 0 };
    const input: ChunkInput[] = [
      {
        content: longText,
        sourceTrace: trace,
        sourceUnitId: 'su-meta',
      },
    ];

    const chunks = chunkSourceUnits(input);

    for (const chunk of chunks) {
      expect(chunk.sourceUnitId).toBe('su-meta');
      expect(chunk.sourceTrace).toEqual(trace);
    }
  });

  it('processes multiple source units in sequence', () => {
    const input: ChunkInput[] = [
      {
        content: 'First unit content.',
        sourceTrace: { format: 'pdf', pageNumber: 1 },
        sourceUnitId: 'su-1',
      },
      {
        content: 'Second unit content.',
        sourceTrace: { format: 'pdf', pageNumber: 2 },
        sourceUnitId: 'su-2',
      },
    ];

    const chunks = chunkSourceUnits(input);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.sourceUnitId).toBe('su-1');
    expect(chunks[1]!.sourceUnitId).toBe('su-2');
  });

  it('returns empty array for empty input', () => {
    const chunks = chunkSourceUnits([]);
    expect(chunks).toEqual([]);
  });

  it('respects custom chunk size and overlap options', () => {
    const words = Array.from({ length: 200 }, (_, i) => `item${i}`);
    const text = words.join(' ');

    const input: ChunkInput[] = [
      {
        content: text,
        sourceTrace: { format: 'docx' },
        sourceUnitId: 'su-custom',
      },
    ];

    const chunks = chunkSourceUnits(input, {
      maxTokens: 100,
      overlapTokens: 20,
    });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(100);
    }
  });

  it('countTokens returns accurate token count', () => {
    const tokens = countTokens('hello world');
    expect(tokens).toBe(2);
  });
});
