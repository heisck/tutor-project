import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  serializeTutorStreamEvents,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorSessionExperience } from './tutor-session-experience';

const apiBaseUrl = 'http://localhost:4000';

describe('TutorSessionExperience reconnect behavior', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost:3000/session');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(
    'recovers from an interrupted tutor stream without duplicating the current message',
    async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn<typeof fetch>();
      global.fetch = fetchMock;
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(201, {
            learningProfile: {
              academicLevel: 'undergraduate',
              explanationStartPreference: 'example_first',
              lastCalibratedAt: '2026-04-14T10:00:00.000Z',
              sessionGoal: 'deep_understanding',
            },
            session: baseSessionRecord(),
          }),
        )
        .mockResolvedValueOnce(jsonResponse(200, buildSessionStateResponse()))
        .mockResolvedValueOnce(interruptedStreamResponse(buildTutorEvents()))
        .mockResolvedValueOnce(streamResponse(buildTutorEvents()));

      render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

      await user.type(
        screen.getByPlaceholderText('Paste the processed document ID'),
        'document-1',
      );
      await user.click(
        screen.getByRole('button', { name: 'Start tutoring session' }),
      );

      expect(await screen.findByText('Tutor message')).toBeInTheDocument();
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      await user.click(
        screen.getByRole('button', { name: 'Refresh tutor explanation' }),
      );

      await waitFor(() => {
        expect(screen.getAllByText('Tutor message')).toHaveLength(1);
      });
      expect(fetchMock.mock.calls[3]?.[0]).toBe(
        'http://localhost:4000/api/v1/tutor/next',
      );
    },
    10_000,
  );
});

function baseSegmentRecord() {
  return {
    analogyPrompt: 'Imagine pushing a shopping cart that gets heavier each time.',
    atuIds: ['atu-1'],
    checkPrompt: 'How would you explain why force depends on mass?',
    chunkIds: ['chunk-1'],
    conceptDescription: 'How force, mass, and acceleration relate.',
    conceptId: 'concept-1',
    conceptTitle: 'Forces',
    coverageSummary: {
      assessed: 0,
      inProgress: 0,
      notTaught: 1,
      taught: 0,
    },
    explanationStrategy: 'example_first',
    id: 'segment-1',
    masteryGate: {
      confusionThreshold: 0.4,
      minimumChecks: 2,
      requiredQuestionTypes: ['explanation'],
      requiresDistinctQuestionTypes: false,
    },
    ordinal: 0,
    prerequisiteConceptIds: [],
    sectionId: 'section-1',
    sourceOrdinal: 0,
    sourceUnitIds: ['source-unit-1'],
    studySessionId: 'session-1',
  } as const;
}

function baseSessionRecord() {
  return {
    createdAt: '2026-04-14T10:00:00.000Z',
    currentSectionId: 'section-1',
    currentSegmentId: 'segment-1',
    currentStep: 0,
    documentId: 'document-1',
    frustrationFlagCount: 0,
    id: 'session-1',
    lastActiveAt: '2026-04-14T10:00:01.000Z',
    mode: 'full',
    motivationState: 'neutral',
    startedAt: '2026-04-14T10:00:01.000Z',
    status: 'active',
    updatedAt: '2026-04-14T10:00:01.000Z',
  } as const;
}

function buildSessionStateResponse() {
  return {
    continuity: {
      hasInterruptedState: false,
      interruptedAt: null,
      isResumable: false,
      masterySnapshot: [],
      resumeNotes: 'Resume from Forces after the last saved checkpoint.',
      resumeSectionId: 'section-1',
      resumeSegmentId: 'segment-1',
      resumeSegmentTitle: 'Forces',
      resumeStep: 0,
      unresolvedAtuIds: ['atu-1'],
    },
    handoffSnapshot: null,
    learningProfile: {
      academicLevel: 'undergraduate',
      explanationStartPreference: 'example_first',
      lastCalibratedAt: '2026-04-14T10:00:00.000Z',
      sessionGoal: 'deep_understanding',
    },
    session: baseSessionRecord(),
    summary: {
      canComplete: false,
      completionBlockedReason:
        '1 concept(s) still unresolved: 0 mastered, 0 partial, 0 taught, 0 weak',
      coverageSummary: {
        assessed: 0,
        inProgress: 0,
        notTaught: 1,
        taught: 0,
      },
      masteredTopics: [],
      readinessEstimate: 'Early stages — continue studying for stronger foundations',
      shakyTopics: [],
      unresolvedAtuIds: ['atu-1'],
      unresolvedTopics: ['Forces'],
    },
    teachingPlan: {
      currentSegmentId: 'segment-1',
      segments: [baseSegmentRecord()],
      sessionId: 'session-1',
    },
  };
}

function buildTutorEvents(): TutorStreamEvent[] {
  return [
    {
      data: {
        action: 'stream_open',
        connectionId: 'connection-1',
        protocolVersion: 'v1',
        retryAfterMs: 3000,
        sessionId: 'session-1',
      },
      sentAt: '2026-04-14T10:00:00.000Z',
      sequence: 1,
      type: 'control',
    },
    {
      data: {
        currentSegmentId: 'segment-1',
        currentStep: 0,
        segmentOrdinal: 0,
        sessionId: 'session-1',
        stage: 'segment_ready',
        totalSegments: 1,
      },
      sentAt: '2026-04-14T10:00:00.001Z',
      sequence: 2,
      type: 'progress',
    },
    {
      data: {
        content:
          'Newton frames the relationship as $F = ma$.\n\n- More mass needs more push\n- More acceleration needs more push',
        format: 'markdown',
        messageId: 'message-1',
        role: 'tutor',
        segmentId: 'segment-1',
      },
      sentAt: '2026-04-14T10:00:00.002Z',
      sequence: 3,
      type: 'message',
    },
    {
      data: {
        currentSegmentId: 'segment-1',
        deliveredEventCount: 4,
        reason: 'await_learner_response',
        sessionId: 'session-1',
      },
      sentAt: '2026-04-14T10:00:00.003Z',
      sequence: 4,
      type: 'completion',
    },
  ];
}

function interruptedStreamResponse(events: readonly TutorStreamEvent[]): Response {
  const payload =
    serializeTutorStreamEvents(events.slice(0, 3)) +
    'id: 4\nevent: tutor.completion\ndata: {"type":"completion"';

  return new Response(payload, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
    status: 200,
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });
}

function streamResponse(events: readonly TutorStreamEvent[]): Response {
  return new Response(serializeTutorStreamEvents(events), {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
    status: 200,
  });
}
