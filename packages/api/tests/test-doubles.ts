import type { DocumentProcessingQueue } from '../src/documents/queue.js';

export function createNoopDocumentProcessingQueue(): DocumentProcessingQueue {
  return {
    async enqueue(input) {
      return {
        jobId: `${input.documentId}:noop-job`,
      };
    },
  };
}
