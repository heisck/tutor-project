import type { GroundedChunk } from '@ai-tutor-pwa/shared';

const PROMPT_INJECTION_PATTERNS = [
  /\bignore\b[\s\S]{0,80}\binstructions?\b/i,
  /\b(system|developer)\s+prompt\b/i,
  /\bprompt override\b/i,
  /\bact as\b/i,
  /\byou are chatgpt\b/i,
  /\brole:\s*(assistant|developer|system|user)\b/i,
  /<\/?document-evidence>/i,
];

export const DOCUMENT_EVIDENCE_WRAPPER = {
  close: '</document-evidence>',
  open: '<document-evidence>',
} as const;

export function isPromptInjectionLikeDocumentText(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function serializeGroundedChunkAsDocumentData(
  chunk: GroundedChunk,
  index: number,
): string {
  return JSON.stringify({
    content: escapeDocumentBoundaryChars(chunk.content),
    evidenceIndex: index + 1,
    relevance: Number(chunk.score.toFixed(2)),
  });
}

function escapeDocumentBoundaryChars(text: string): string {
  return text.replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}
