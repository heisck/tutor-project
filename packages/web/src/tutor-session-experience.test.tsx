import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  serializeTutorStreamEvents,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorSessionExperience } from './tutor-session-experience';

const apiBaseUrl = 'http://localhost:4000';

describe('TutorSessionExperience', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost:3000/session');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(
    'starts a session with calibration, renders streamed tutor content, and submits a learner response',
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
        .mockResolvedValueOnce(streamResponse(buildTutorEvents()))
        .mockResolvedValueOnce(
          jsonResponse(200, {
            evaluation: {
              confusionScore: 0.1,
              confusionSignals: ['no_signal'],
              errorClassification: 'none',
              illusionOfUnderstanding: false,
              isCorrect: true,
              reasoning: 'Response demonstrates understanding',
            },
            mastery: {
              conceptId: 'concept-1',
              confusionScore: 0.1,
              previousStatus: 'not_taught',
              status: 'taught',
            },
          }),
        );
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          200,
          buildSessionStateResponse({
            continuity: {
              hasInterruptedState: true,
              masterySnapshot: [
                {
                  conceptId: 'concept-1',
                  confusionScore: 0.1,
                  evidenceCount: 0,
                  status: 'taught',
                },
              ],
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              unresolvedAtuIds: ['atu-1'],
            },
            handoffSnapshot: {
              createdAt: '2026-04-14T10:00:02.000Z',
              currentSectionId: 'section-1',
              currentSegmentId: 'segment-1',
              currentStep: 0,
              explanationHistory: [],
              masterySnapshot: [
                {
                  conceptId: 'concept-1',
                  confusionScore: 0.1,
                  evidenceCount: 0,
                  status: 'taught',
                },
              ],
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              sessionId: 'session-1',
              unresolvedAtuIds: ['atu-1'],
              updatedAt: '2026-04-14T10:00:02.000Z',
            },
            summary: {
              coverageSummary: {
                assessed: 0,
                inProgress: 0,
                notTaught: 0,
                taught: 1,
              },
            },
          }),
        ),
      );

      render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

      await user.type(
        screen.getByPlaceholderText('Paste the processed document ID'),
        'document-1',
      );
      await user.click(
        screen.getByRole('button', { name: 'Start tutoring session' }),
      );

      expect(await screen.findByText('Tutor message')).toBeInTheDocument();
      expect(document.querySelector('.katex')).not.toBeNull();

      await user.type(
        screen.getByPlaceholderText(
          'How would you explain why force depends on mass?',
        ),
        'Force grows when mass grows because more inertia must be overcome.',
      );
      await user.click(
        screen.getByRole('button', { name: 'Submit learner response' }),
      );

      expect(await screen.findByText('Response evaluated')).toBeInTheDocument();
      expect(
        screen.getByText('Response demonstrates understanding'),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/Resume from Forces after the last saved checkpoint\./),
      ).toHaveLength(2);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(5);
      });
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'http://localhost:4000/api/v1/sessions/start',
      );
      expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
        credentials: 'include',
        method: 'POST',
      });
      expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          calibration: {
            academicLevel: 'undergraduate',
            explanationStartPreference: 'example_first',
            sessionGoal: 'deep_understanding',
          },
          documentId: 'document-1',
        }),
      );
      expect(fetchMock.mock.calls[3]?.[0]).toBe(
        'http://localhost:4000/api/v1/tutor/evaluate',
      );
      expect(fetchMock.mock.calls[3]?.[1]?.body).toBe(
        JSON.stringify({
          content:
            'Force grows when mass grows because more inertia must be overcome.',
          segmentId: 'segment-1',
          sessionId: 'session-1',
        }),
      );
      expect(fetchMock.mock.calls[4]?.[0]).toBe(
        'http://localhost:4000/api/v1/sessions/session-1/state',
      );
    },
    40_000,
  );

  it('shows validation errors returned by the response submission path', async () => {
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
      .mockResolvedValueOnce(streamResponse(buildTutorEvents()))
      .mockResolvedValueOnce(
        jsonResponse(400, {
          message: 'Tutor evaluation rejected this response',
        }),
      );

    render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

    await user.type(
      screen.getByPlaceholderText('Paste the processed document ID'),
      'document-1',
    );
    await user.click(
      screen.getByRole('button', { name: 'Start tutoring session' }),
    );

    expect(await screen.findByText('Tutor message')).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText('How would you explain why force depends on mass?'),
      'It depends on how hard I push.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Submit learner response' }),
    );

    expect(
      await screen.findByText('Tutor evaluation rejected this response'),
    ).toBeInTheDocument();
  });

  it('pauses an active session and renders the persisted continuity checkpoint', async () => {
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
      .mockResolvedValueOnce(streamResponse(buildTutorEvents()))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          learningProfile: {
            academicLevel: 'undergraduate',
            explanationStartPreference: 'example_first',
            lastCalibratedAt: '2026-04-14T10:00:00.000Z',
            sessionGoal: 'deep_understanding',
          },
          session: baseSessionRecord({
            status: 'paused',
            updatedAt: '2026-04-14T10:05:00.000Z',
          }),
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          buildSessionStateResponse({
            continuity: {
              hasInterruptedState: true,
              interruptedAt: '2026-04-14T10:05:00.000Z',
              isResumable: true,
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              unresolvedAtuIds: ['atu-1'],
            },
            handoffSnapshot: {
              createdAt: '2026-04-14T10:05:00.000Z',
              currentSectionId: 'section-1',
              currentSegmentId: 'segment-1',
              currentStep: 0,
              explanationHistory: [],
              masterySnapshot: [],
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              sessionId: 'session-1',
              unresolvedAtuIds: ['atu-1'],
              updatedAt: '2026-04-14T10:05:00.000Z',
            },
            session: baseSessionRecord({
              status: 'paused',
              updatedAt: '2026-04-14T10:05:00.000Z',
            }),
          }),
        ),
      );

    render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

    await user.type(
      screen.getByPlaceholderText('Paste the processed document ID'),
      'document-1',
    );
    await user.click(
      screen.getByRole('button', { name: 'Start tutoring session' }),
    );
    await user.click(screen.getByRole('button', { name: 'Pause session' }));

    expect(
      await screen.findByRole('button', { name: 'Resume session' }),
    ).toBeEnabled();
    expect(
      screen.getAllByText(/Resume from Forces after the last saved checkpoint\./),
    ).toHaveLength(2);
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      'http://localhost:4000/api/v1/sessions/session-1/pause',
    );
    expect(fetchMock.mock.calls[3]?.[1]?.body).toBe(
      JSON.stringify({
        handoff: {
          currentSectionId: 'section-1',
          currentSegmentId: 'segment-1',
          currentStep: 0,
          explanationHistory: [],
          masterySnapshot: [],
          resumeNotes: 'Resume from Forces after the last saved checkpoint.',
          unresolvedAtuIds: ['atu-1'],
        },
      }),
    );
  });

  it('reloads a paused session from the URL, resumes it, and renders persisted summary data', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>();
    global.fetch = fetchMock;
    window.history.replaceState(
      {},
      '',
      'http://localhost:3000/session?sessionId=session-1',
    );
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          buildSessionStateResponse({
            continuity: {
              hasInterruptedState: true,
              interruptedAt: '2026-04-14T10:05:00.000Z',
              isResumable: true,
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              unresolvedAtuIds: ['atu-1'],
            },
            handoffSnapshot: {
              createdAt: '2026-04-14T10:05:00.000Z',
              currentSectionId: 'section-1',
              currentSegmentId: 'segment-1',
              currentStep: 0,
              explanationHistory: [],
              masterySnapshot: [],
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              sessionId: 'session-1',
              unresolvedAtuIds: ['atu-1'],
              updatedAt: '2026-04-14T10:05:00.000Z',
            },
            session: baseSessionRecord({
              status: 'paused',
              updatedAt: '2026-04-14T10:05:00.000Z',
            }),
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          learningProfile: {
            academicLevel: 'undergraduate',
            explanationStartPreference: 'example_first',
            lastCalibratedAt: '2026-04-14T10:00:00.000Z',
            sessionGoal: 'deep_understanding',
          },
          session: baseSessionRecord(),
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          buildSessionStateResponse({
            continuity: {
              hasInterruptedState: true,
              interruptedAt: '2026-04-14T10:05:00.000Z',
              isResumable: false,
              masterySnapshot: [
                {
                  conceptId: 'concept-1',
                  confusionScore: 0.05,
                  evidenceCount: 2,
                  status: 'mastered',
                },
              ],
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              unresolvedAtuIds: [],
            },
            handoffSnapshot: {
              createdAt: '2026-04-14T10:05:00.000Z',
              currentSectionId: 'section-1',
              currentSegmentId: 'segment-1',
              currentStep: 0,
              explanationHistory: [],
              masterySnapshot: [
                {
                  conceptId: 'concept-1',
                  confusionScore: 0.05,
                  evidenceCount: 2,
                  status: 'mastered',
                },
              ],
              resumeNotes: 'Resume from Forces after the last saved checkpoint.',
              sessionId: 'session-1',
              unresolvedAtuIds: [],
              updatedAt: '2026-04-14T10:05:00.000Z',
            },
            summary: {
              canComplete: true,
              completionBlockedReason: 'All 1 concepts mastered',
              coverageSummary: {
                assessed: 1,
                inProgress: 0,
                notTaught: 0,
                taught: 0,
              },
              masteredTopics: ['Forces'],
              readinessEstimate: 'Strong understanding — ready for assessment',
              unresolvedAtuIds: [],
              unresolvedTopics: [],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(streamResponse(buildTutorEvents()));

    render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

    expect(
      await screen.findAllByText(/Resume from Forces after the last saved checkpoint\./),
    ).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Resume session' }));

    expect(await screen.findByText('Tutor message')).toBeInTheDocument();
    expect(
      screen.getByText('Strong understanding — ready for assessment'),
    ).toBeInTheDocument();
    expect(screen.getByText('All 1 concepts mastered')).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://localhost:4000/api/v1/sessions/session-1/resume',
    );
  });

  it('asks the in-session assistant with session-scoped payload and renders grounded evidence', async () => {
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
      .mockResolvedValueOnce(streamResponse(buildTutorEvents()))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          answer:
            "Based on your document's Forces material, here is the best grounded answer.\n\nShort answer: Newton frames the relationship as force changing with mass and acceleration.",
          currentSegmentId: 'segment-1',
          documentId: 'document-1',
          groundedEvidence: [
            {
              content:
                'Newton frames the relationship as force changing with mass and acceleration.',
              id: 'chunk-1',
              score: 0.92,
            },
          ],
          outcome: 'answered',
          understandingCheck:
            'How would you explain that back in one sentence using the idea of Forces?',
        }),
      );

    render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

    await user.type(
      screen.getByPlaceholderText('Paste the processed document ID'),
      'document-1',
    );
    await user.click(
      screen.getByRole('button', { name: 'Start tutoring session' }),
    );

    expect(await screen.findByText('Tutor message')).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText('Ask a question about this session document.'),
      'Why does force change when mass changes?',
    );
    await user.click(
      screen.getByRole('button', { name: 'Ask session assistant' }),
    );

    expect(
      await screen.findByText(
        'The assistant found enough document support to answer directly.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/How would you explain that back in one sentence/),
    ).toBeInTheDocument();
    expect(screen.getByText('Grounding evidence')).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      'http://localhost:4000/api/v1/tutor/question',
    );
    expect(fetchMock.mock.calls[3]?.[1]?.body).toBe(
      JSON.stringify({
        question: 'Why does force change when mass changes?',
        sessionId: 'session-1',
      }),
    );
  });

  it('renders refusal feedback clearly when the session assistant cannot ground an answer', async () => {
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
      .mockResolvedValueOnce(streamResponse(buildTutorEvents()))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          answer:
            'I could not find enough grounded context in your document to answer that without guessing.',
          currentSegmentId: 'segment-1',
          documentId: 'document-1',
          groundedEvidence: [],
          outcome: 'refused',
          understandingCheck: null,
        }),
      );

    render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

    await user.type(
      screen.getByPlaceholderText('Paste the processed document ID'),
      'document-1',
    );
    await user.click(
      screen.getByRole('button', { name: 'Start tutoring session' }),
    );

    expect(await screen.findByText('Tutor message')).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText('Ask a question about this session document.'),
      'How do black holes bend spacetime?',
    );
    await user.click(
      screen.getByRole('button', { name: 'Ask session assistant' }),
    );

    expect(
      await screen.findByText(
        'The assistant refused to guess because the question was not grounded strongly enough in the document.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No document chunks met the grounding threshold for this question.',
      ),
    ).toBeInTheDocument();
  });

  it('submits tutor explanation feedback from the streamed tutoring surface', async () => {
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
      .mockResolvedValueOnce(streamResponse(buildTutorEvents()))
      .mockResolvedValueOnce(
        jsonResponse(201, {
          feedback: {
            conceptId: 'concept-1',
            contentType: 'tutor_explanation',
            createdAt: '2026-04-14T10:00:05.000Z',
            documentId: 'document-1',
            id: 'feedback-1',
            lessonSegmentId: 'segment-1',
            messageId: 'message-1',
            reason: 'hallucination',
            scopeKey: 'tutor_explanation:concept-1',
            sessionId: 'session-1',
          },
          threshold: {
            feedbackCount: 1,
            requiresReview: false,
            status: 'recorded',
            threshold: 4,
          },
        }),
      );

    render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

    await user.type(
      screen.getByPlaceholderText('Paste the processed document ID'),
      'document-1',
    );
    await user.click(
      screen.getByRole('button', { name: 'Start tutoring session' }),
    );

    expect(await screen.findByText('Tutor message')).toBeInTheDocument();
    await user.click(
      screen.getAllByRole('button', { name: 'Report hallucination' })[0]!,
    );

    expect(await screen.findByText('Feedback recorded for review.')).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      'http://localhost:4000/api/v1/feedback',
    );
    expect(fetchMock.mock.calls[3]?.[1]?.body).toBe(
      JSON.stringify({
        contentType: 'tutor_explanation',
        lessonSegmentId: 'segment-1',
        messageId: 'message-1',
        reason: 'hallucination',
        sessionId: 'session-1',
      }),
    );
  });

  it('submits assistant feedback and renders the threshold escalation message', async () => {
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
      .mockResolvedValueOnce(streamResponse(buildTutorEvents()))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          answer:
            "Based on your document's Forces material, here is the best grounded answer.\n\nShort answer: Newton frames the relationship as force changing with mass and acceleration.",
          currentSegmentId: 'segment-1',
          documentId: 'document-1',
          groundedEvidence: [
            {
              content:
                'Newton frames the relationship as force changing with mass and acceleration.',
              id: 'chunk-1',
              score: 0.92,
            },
          ],
          outcome: 'answered',
          understandingCheck:
            'How would you explain that back in one sentence using the idea of Forces?',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(201, {
          feedback: {
            conceptId: 'concept-1',
            contentType: 'assistant_answer',
            createdAt: '2026-04-14T10:00:07.000Z',
            documentId: 'document-1',
            id: 'feedback-2',
            lessonSegmentId: 'segment-1',
            messageId: null,
            reason: 'hallucination',
            scopeKey: 'assistant_answer:concept-1',
            sessionId: 'session-1',
          },
          threshold: {
            feedbackCount: 4,
            requiresReview: true,
            status: 'threshold_triggered',
            threshold: 4,
          },
        }),
      );

    render(<TutorSessionExperience apiBaseUrl={apiBaseUrl} />);

    await user.type(
      screen.getByPlaceholderText('Paste the processed document ID'),
      'document-1',
    );
    await user.click(
      screen.getByRole('button', { name: 'Start tutoring session' }),
    );

    expect(await screen.findByText('Tutor message')).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText('Ask a question about this session document.'),
      'Why does force change when mass changes?',
    );
    await user.click(
      screen.getByRole('button', { name: 'Ask session assistant' }),
    );
    expect(
      await screen.findByText(
        'The assistant found enough document support to answer directly.',
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: 'Report hallucination' })[1]!,
    );

    expect(
      await screen.findByText(
        'Feedback recorded and escalated for operator review.',
      ),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[4]?.[0]).toBe(
      'http://localhost:4000/api/v1/feedback',
    );
    expect(fetchMock.mock.calls[4]?.[1]?.body).toBe(
      JSON.stringify({
        contentType: 'assistant_answer',
        lessonSegmentId: 'segment-1',
        messageId: null,
        reason: 'hallucination',
        sessionId: 'session-1',
      }),
    );
  });
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

function baseSessionRecord(
  overrides: Partial<{
    createdAt: string;
    currentSectionId: string | null;
    currentSegmentId: string | null;
    currentStep: number;
    documentId: string;
    frustrationFlagCount: number;
    id: string;
    lastActiveAt: string | null;
    mode: 'full';
    motivationState: 'neutral';
    startedAt: string | null;
    status: 'active' | 'paused' | 'completed' | 'incomplete';
    updatedAt: string;
  }> = {},
) {
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
    ...overrides,
  } as const;
}

function buildSessionStateResponse(
  overrides?: Partial<{
    continuity: Partial<{
      hasInterruptedState: boolean;
      interruptedAt: string | null;
      isResumable: boolean;
      masterySnapshot: Array<{
        conceptId: string;
        confusionScore: number;
        evidenceCount: number;
        status: string;
      }>;
      resumeNotes: string | null;
      resumeSectionId: string | null;
      resumeSegmentId: string | null;
      resumeSegmentTitle: string | null;
      resumeStep: number | null;
      unresolvedAtuIds: string[];
    }>;
    handoffSnapshot: Record<string, unknown> | null;
    session: ReturnType<typeof baseSessionRecord>;
    summary: Partial<{
      canComplete: boolean;
      completionBlockedReason: string;
      coverageSummary: {
        assessed: number;
        inProgress: number;
        notTaught: number;
        taught: number;
      };
      masteredTopics: string[];
      readinessEstimate: string;
      shakyTopics: string[];
      unresolvedAtuIds: string[];
      unresolvedTopics: string[];
    }>;
  }>,
) {
  const session = overrides?.session ?? baseSessionRecord();

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
      ...overrides?.continuity,
    },
    handoffSnapshot: overrides?.handoffSnapshot ?? null,
    learningProfile: {
      academicLevel: 'undergraduate',
      explanationStartPreference: 'example_first',
      lastCalibratedAt: '2026-04-14T10:00:00.000Z',
      sessionGoal: 'deep_understanding',
    },
    session,
    summary: {
      canComplete: false,
      completionBlockedReason: '1 concept(s) still unresolved: 0 mastered, 0 partial, 0 taught, 0 weak',
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
      ...overrides?.summary,
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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });
}

function streamResponse(events: readonly TutorStreamEvent[]): Response {
  const payload = serializeTutorStreamEvents(events);
  return new Response(payload, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
    status: 200,
  });
}
