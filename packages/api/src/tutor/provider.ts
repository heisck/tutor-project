import Anthropic from '@anthropic-ai/sdk';
import OpenAI, { toFile } from 'openai';
import type {
  CheckQuestionType,
  GroundedChunk,
  ResponseEvaluation,
  TutorPromptContext,
} from '@ai-tutor-pwa/shared';
import { responseEvaluationSchema } from '@ai-tutor-pwa/shared';

import type { ApiEnv } from '../config/env.js';
import { AI_CALL_CONFIGS, executeAiCall } from '../lib/ai-runtime.js';
import {
  assembleTutorSystemPrompt,
  assembleTutorUserPrompt,
} from './prompt-assembly.js';
import { heuristicEvaluateLearnerResponse } from './evaluation.js';

export interface TutorMessageGenerationResult {
  degradedReason: string | null;
  providerCallCount: number;
  text: string;
}

export interface TutorEvaluationGenerationResult {
  degradedReason: string | null;
  evaluation: ResponseEvaluation;
  providerCallCount: number;
}

export interface TutorAssistantGenerationResult {
  answer: string;
  degradedReason: string | null;
  providerCallCount: number;
  understandingCheck: string | null;
}

export interface TutorVoiceTranscriptionResult {
  degradedReason: string | null;
  providerCallCount: number;
  transcript: string;
}

export interface TutorVoiceSynthesisResult {
  audioBase64: string;
  contentType: string;
  degradedReason: string | null;
  playbackRate: number;
  providerCallCount: number;
}

export interface TutorAiProvider {
  evaluateLearnerResponse(input: {
    checkType: CheckQuestionType | null;
    conceptTitle: string;
    learnerResponse: string;
    promptContext: TutorPromptContext;
  }): Promise<TutorEvaluationGenerationResult>;
  generateAssistantAnswer(input: {
    conceptTitle: string | null;
    groundedEvidence: readonly GroundedChunk[];
    question: string;
  }): Promise<TutorAssistantGenerationResult>;
  generateTutorMessage(
    context: TutorPromptContext,
  ): Promise<TutorMessageGenerationResult>;
  synthesizeSpeech(input: {
    playbackRate: number;
    text: string;
  }): Promise<TutorVoiceSynthesisResult>;
  transcribeAudio(input: {
    audioBase64: string;
    mimeType: string;
  }): Promise<TutorVoiceTranscriptionResult>;
}

export function createTutorAiProvider(env: ApiEnv): TutorAiProvider {
  if (env.NODE_ENV === 'test') {
    return createFallbackTutorAiProvider();
  }

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return {
    async generateTutorMessage(
      context: TutorPromptContext,
    ): Promise<TutorMessageGenerationResult> {
      const fallbackText = buildFallbackTutorMessage(context);
      const result = await executeAiCall('tutorGeneration', async (signal) => {
        const response = await anthropic.messages.create(
          {
            max_tokens: AI_CALL_CONFIGS.tutorGeneration.maxTokens,
            messages: [
              {
                content: assembleTutorUserPrompt(context),
                role: 'user',
              },
            ],
            model: AI_CALL_CONFIGS.tutorGeneration.model,
            system: assembleTutorSystemPrompt(context),
          },
          { signal },
        );

        return {
          data: response,
          finishReason: response.stop_reason ?? null,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      });

      if (!result.ok) {
        return {
          degradedReason: `Tutor generation fallback: ${result.reason}`,
          providerCallCount: 0,
          text: fallbackText,
        };
      }

      const text = extractAnthropicText(result.data.content).trim();

      return {
        degradedReason: text.length === 0 ? 'Tutor generation fallback: empty provider output' : null,
        providerCallCount: text.length === 0 ? 0 : 1,
        text: text.length === 0 ? fallbackText : text,
      };
    },

    async evaluateLearnerResponse(input) {
      const fallbackEvaluation = heuristicEvaluateLearnerResponse(
        input.learnerResponse,
      );
      const result = await executeAiCall('tutorEvaluation', async (signal) => {
        const response = await anthropic.messages.create(
          {
            max_tokens: AI_CALL_CONFIGS.tutorEvaluation.maxTokens,
            messages: [
              {
                content: buildTutorEvaluationPrompt(input),
                role: 'user',
              },
            ],
            model: AI_CALL_CONFIGS.tutorEvaluation.model,
            system: TUTOR_EVALUATION_SYSTEM_PROMPT,
          },
          { signal },
        );

        return {
          data: response,
          finishReason: response.stop_reason ?? null,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      });

      if (!result.ok) {
        return {
          degradedReason: `Tutor evaluation fallback: ${result.reason}`,
          evaluation: fallbackEvaluation,
          providerCallCount: 0,
        };
      }

      const parsedEvaluation = safeParseEvaluation(
        extractAnthropicText(result.data.content),
      );

      if (parsedEvaluation === null) {
        return {
          degradedReason: 'Tutor evaluation fallback: provider output could not be parsed',
          evaluation: fallbackEvaluation,
          providerCallCount: 0,
        };
      }

      return {
        degradedReason: null,
        evaluation: parsedEvaluation,
        providerCallCount: 1,
      };
    },

    async generateAssistantAnswer(input) {
      const fallback = buildFallbackAssistantAnswer(input);
      const result = await executeAiCall('tutorAssistant', async (signal) => {
        const response = await anthropic.messages.create(
          {
            max_tokens: AI_CALL_CONFIGS.tutorAssistant.maxTokens,
            messages: [
              {
                content: buildAssistantPrompt(input),
                role: 'user',
              },
            ],
            model: AI_CALL_CONFIGS.tutorAssistant.model,
            system: ASSISTANT_SYSTEM_PROMPT,
          },
          { signal },
        );

        return {
          data: response,
          finishReason: response.stop_reason ?? null,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      });

      if (!result.ok) {
        return {
          ...fallback,
          degradedReason: `Assistant fallback: ${result.reason}`,
          providerCallCount: 0,
        };
      }

      const parsed = safeParseJson<{ answer: string; understandingCheck: string | null }>(
        extractAnthropicText(result.data.content),
      );

      if (
        parsed === null ||
        typeof parsed.answer !== 'string' ||
        parsed.answer.trim().length === 0
      ) {
        return {
          ...fallback,
          degradedReason: 'Assistant fallback: provider output could not be parsed',
          providerCallCount: 0,
        };
      }

      return {
        answer: parsed.answer.trim(),
        degradedReason: null,
        providerCallCount: 1,
        understandingCheck:
          typeof parsed.understandingCheck === 'string' &&
          parsed.understandingCheck.trim().length > 0
            ? parsed.understandingCheck.trim()
            : null,
      };
    },

    async transcribeAudio(input) {
      const result = await executeAiCall('voiceTranscription', async (signal) => {
        const file = await toFile(
          Buffer.from(input.audioBase64, 'base64'),
          'voice-input.webm',
          { type: input.mimeType },
        );
        const response = await openai.audio.transcriptions.create(
          {
            file,
            model: AI_CALL_CONFIGS.voiceTranscription.model,
            response_format: 'json',
          },
          { signal },
        );

        return {
          data: response,
          finishReason: null,
          usage:
            response.usage?.type === 'tokens'
              ? {
                  inputTokens: response.usage.input_tokens,
                  outputTokens: response.usage.output_tokens,
                }
              : null,
        };
      });

      if (!result.ok) {
        return {
          degradedReason: `Voice transcription fallback: ${result.reason}`,
          providerCallCount: 0,
          transcript: 'Transcription unavailable. Try typing your response instead.',
        };
      }

      return {
        degradedReason: null,
        providerCallCount: 1,
        transcript: result.data.text,
      };
    },

    async synthesizeSpeech(input) {
      const result = await executeAiCall('voiceSynthesis', async (signal) => {
        const response = await openai.audio.speech.create(
          {
            input: input.text,
            model: AI_CALL_CONFIGS.voiceSynthesis.model,
            response_format: 'mp3',
            speed: input.playbackRate,
            voice: 'alloy',
          },
          { signal },
        );

        return {
          data: Buffer.from(await response.arrayBuffer()),
          finishReason: null,
          usage: null,
        };
      });

      if (!result.ok) {
        return {
          audioBase64: Buffer.from(input.text, 'utf8').toString('base64'),
          contentType: 'audio/mpeg',
          degradedReason: `Voice synthesis fallback: ${result.reason}`,
          playbackRate: input.playbackRate,
          providerCallCount: 0,
        };
      }

      return {
        audioBase64: result.data.toString('base64'),
        contentType: 'audio/mpeg',
        degradedReason: null,
        playbackRate: input.playbackRate,
        providerCallCount: 1,
      };
    },
  };
}

export function createFallbackTutorAiProvider(): TutorAiProvider {
  return {
    async generateTutorMessage(context) {
      return {
        degradedReason: 'Tutor generation is running in deterministic fallback mode.',
        providerCallCount: 0,
        text: buildFallbackTutorMessage(context),
      };
    },

    async evaluateLearnerResponse(input) {
      return {
        degradedReason: 'Tutor evaluation is running in deterministic fallback mode.',
        evaluation: heuristicEvaluateLearnerResponse(input.learnerResponse),
        providerCallCount: 0,
      };
    },

    async generateAssistantAnswer(input) {
      return {
        ...buildFallbackAssistantAnswer(input),
        degradedReason: 'Assistant answering is running in deterministic fallback mode.',
        providerCallCount: 0,
      };
    },

    async transcribeAudio() {
      return {
        degradedReason: 'Voice transcription is running in deterministic fallback mode.',
        providerCallCount: 0,
        transcript: 'Test me on the current concept.',
      };
    },

    async synthesizeSpeech(input) {
      return {
        audioBase64: Buffer.from(input.text, 'utf8').toString('base64'),
        contentType: 'audio/mpeg',
        degradedReason: 'Voice synthesis is running in deterministic fallback mode.',
        playbackRate: input.playbackRate,
        providerCallCount: 0,
      };
    },
  };
}

function buildFallbackTutorMessage(context: TutorPromptContext): string {
  const intro =
    context.action === 'check'
      ? `Let's check ${context.conceptTitle}.`
      : context.action === 'reteach'
        ? `Let's try ${context.conceptTitle} from a different angle.`
        : context.action === 'refine'
          ? `You're close on ${context.conceptTitle}, so let's sharpen it.`
          : context.action === 'advance'
            ? `You have solid footing on ${context.conceptTitle}.`
            : `Let's work through ${context.conceptTitle}.`;
  const evidenceLine = context.groundedEvidence[0]?.content ?? context.segmentAnalogyPrompt;

  switch (context.action) {
    case 'check':
      return `${intro}\n\n${context.segmentCheckPrompt}`;
    case 'advance':
      return `${intro}\n\nKey takeaway: ${evidenceLine}\n\nNext, we build on this with the next concept.`;
    case 'complete_session':
      return `You completed this session.\n\nStrongest takeaway: ${evidenceLine}\n\nCome back to the unresolved topics for revision if needed.`;
    case 'refine':
      return `${intro}\n\nThink of it this way: ${context.segmentAnalogyPrompt}\n\nNow connect that picture to this meaning: ${evidenceLine}`;
    case 'reteach':
    case 'simpler':
    case 'skip':
    case 'teach':
      return `${intro}\n\n${context.segmentAnalogyPrompt}\n\nSimple example: ${evidenceLine}\n\nMeaning: ${context.segmentCheckPrompt}`;
  }
}

function buildFallbackAssistantAnswer(input: {
  conceptTitle: string | null;
  groundedEvidence: readonly GroundedChunk[];
  question: string;
}): {
  answer: string;
  understandingCheck: string | null;
} {
  const leadingEvidence =
    input.groundedEvidence[0]?.content ?? 'I only have a narrow grounded answer here.';
  const scope =
    input.conceptTitle === null
      ? 'your document'
      : `the ${input.conceptTitle} material in your document`;

  return {
    answer: [
      `Grounded answer from ${scope}:`,
      '',
      leadingEvidence,
      '',
      `Question I am answering: ${input.question}`,
    ].join('\n'),
    understandingCheck:
      input.conceptTitle === null
        ? 'How would you restate that in one simple sentence?'
        : `How would you explain ${input.conceptTitle} back in your own words?`,
  };
}

function buildTutorEvaluationPrompt(input: {
  checkType: CheckQuestionType | null;
  conceptTitle: string;
  learnerResponse: string;
  promptContext: TutorPromptContext;
}): string {
  return [
    'Evaluate the learner response for tutoring state transitions.',
    'Return only valid JSON matching this shape:',
    '{"cognitiveLoad":"low|moderate|high","confusionScore":0.0,"confusionSignals":["..."],"errorClassification":"misconception|partial_understanding|memorization|careless_mistake|guessing|vocabulary_block|none","illusionOfUnderstanding":false,"isCorrect":true,"reasoning":"...","recommendedAction":"teach|check|reteach|refine|simpler|skip|advance|complete_session|null","responseQuality":"strong|adequate|weak","unknownTerms":["..."]}',
    '',
    `Concept: ${input.conceptTitle}`,
    `Check type: ${input.checkType ?? 'none'}`,
    `Mode: ${input.promptContext.modeContext.activeMode}`,
    `Segment check prompt: ${input.promptContext.segmentCheckPrompt}`,
    `Learner response: ${input.learnerResponse}`,
    '',
    'Rules:',
    '- Detect confusion early.',
    '- Flag memorization when the learner repeats the idea without transfer, contrast, or simplification.',
    '- Recommend refine when the learner is close but incomplete.',
    '- Unknown terms should list blocking jargon or unexplained terms in the learner response.',
    '- Be strict about story-free memorized answers.',
  ].join('\n');
}

function buildAssistantPrompt(input: {
  conceptTitle: string | null;
  groundedEvidence: readonly GroundedChunk[];
  question: string;
}): string {
  const evidence = input.groundedEvidence
    .map((chunk, index) => `${index + 1}. ${chunk.content}`)
    .join('\n');

  return [
    'Answer the learner question using only the grounded evidence.',
    'Return only valid JSON with keys "answer" and "understandingCheck".',
    'Follow No-Block, Story-First, and Surface-First rules.',
    'Do not invent facts not supported by the evidence.',
    '',
    `Concept focus: ${input.conceptTitle ?? 'current document context'}`,
    `Question: ${input.question}`,
    'Grounded evidence:',
    evidence || 'No grounded evidence available.',
  ].join('\n');
}

function extractAnthropicText(
  content: Anthropic.Messages.Message['content'],
): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function safeParseEvaluation(text: string): ResponseEvaluation | null {
  const parsed = safeParseJson<unknown>(text);

  if (parsed === null) {
    return null;
  }

  const evaluationResult = responseEvaluationSchema.safeParse(parsed);
  return evaluationResult.success ? evaluationResult.data : null;
}

function safeParseJson<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

const TUTOR_EVALUATION_SYSTEM_PROMPT = `You are a strict tutoring evaluator.

You classify learner responses for an adaptive tutoring system.

Rules:
- Return only JSON.
- Detect confusion before obvious failure.
- Prefer "memorization" when the learner repeats language without transfer or real explanation.
- Recommend "refine" when the learner is close but incomplete.
- Recommend "reteach" or "simpler" when confusion is high.
- Never mark weak evidence as correct just because the learner used the right words.`;

const ASSISTANT_SYSTEM_PROMPT = `You are a grounded adaptive study assistant.

Rules:
- Use only the provided evidence.
- No-Block: explain or replace hard terms immediately.
- Story-First: start with a simple picture before the formal meaning when possible.
- Surface-First: simple example, meaning, then technical wording if needed.
- Return only JSON with "answer" and "understandingCheck".`;
