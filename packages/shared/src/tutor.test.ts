import { describe, expect, it } from 'vitest';

import {
  serializeTutorStreamEvent,
  serializeTutorStreamEvents,
  tutorStreamEventSchema,
  type TutorStreamControlEvent,
} from './tutor.js';

describe('tutor stream serialization', () => {
  it('serializes a control event into an SSE frame with id, event, retry, and data', () => {
    const event: TutorStreamControlEvent = {
      data: {
        action: 'stream_open',
        connectionId: 'connection-1',
        protocolVersion: 'v1',
        retryAfterMs: 3000,
        sessionId: 'session-1',
      },
      sentAt: '2026-04-13T00:00:00.000Z',
      sequence: 1,
      type: 'control',
    };

    const frame = serializeTutorStreamEvent(event);

    expect(frame).toContain('id: 1');
    expect(frame).toContain('event: tutor.control');
    expect(frame).toContain('retry: 3000');

    const dataLine = frame
      .split('\n')
      .find((line) => line.startsWith('data: '));

    expect(dataLine).toBeDefined();
    expect(
      tutorStreamEventSchema.parse(JSON.parse(dataLine!.slice('data: '.length))),
    ).toEqual(event);
  });

  it('concatenates multiple events into a valid SSE payload', () => {
    const payload = serializeTutorStreamEvents([
      {
        data: {
          action: 'stream_open',
          connectionId: 'connection-1',
          protocolVersion: 'v1',
          retryAfterMs: 3000,
          sessionId: 'session-1',
        },
        sentAt: '2026-04-13T00:00:00.000Z',
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
          totalSegments: 3,
        },
        sentAt: '2026-04-13T00:00:01.000Z',
        sequence: 2,
        type: 'progress',
      },
    ]);

    expect(payload).toContain('event: tutor.control');
    expect(payload).toContain('event: tutor.progress');
    expect(payload.endsWith('\n\n')).toBe(true);
  });
});
