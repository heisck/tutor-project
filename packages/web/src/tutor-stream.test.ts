import {
  serializeTutorStreamEvents,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';
import { describe, expect, it } from 'vitest';

import { consumeTutorEventStream, parseTutorStreamFrames } from './tutor-stream';

describe('parseTutorStreamFrames', () => {
  it('parses complete frames and preserves an incomplete remainder', () => {
    const payload = [
      'id: 1',
      'event: tutor.control',
      'data: {"type":"control","sequence":1,"sentAt":"2026-04-14T10:00:00.000Z","data":{"action":"stream_open","connectionId":"c1","protocolVersion":"v1","retryAfterMs":3000,"sessionId":"session-1"}}',
      '',
      'id: 2',
      'event: tutor.message',
      'data: {"type":"message","sequence":2,"sentAt":"2026-04-14T10:00:00.000Z","data":{"content":"Tutor says $F=ma$","format":"markdown","messageId":"m1","role":"tutor","segmentId":"segment-1"}}',
      '',
      'id: 3',
    ].join('\n');

    const parsed = parseTutorStreamFrames(payload);

    expect(parsed.events).toHaveLength(2);
    expect(parsed.remainder).toContain('id: 3');
  });
});

describe('consumeTutorEventStream', () => {
  it('emits tutor events in order when the response body arrives in chunks', async () => {
    const expectedEvents: TutorStreamEvent[] = [
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
          content: 'Tutor says $F=ma$',
          format: 'markdown',
          messageId: 'message-1',
          role: 'tutor',
          segmentId: 'segment-1',
        },
        sentAt: '2026-04-14T10:00:00.002Z',
        sequence: 3,
        type: 'message',
      },
    ];
    const serialized = serializeTutorStreamEvents(expectedEvents);
    const encoded = new TextEncoder().encode(serialized);
    const midpoint = Math.floor(encoded.length / 2);
    const chunks = [encoded.slice(0, midpoint), encoded.slice(midpoint)];
    const receivedEvents: TutorStreamEvent[] = [];

    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }

          controller.close();
        },
      }),
    );

    await consumeTutorEventStream(response, (event) => {
      receivedEvents.push(event);
    });

    expect(receivedEvents).toEqual(expectedEvents);
  });

  it('surfaces interrupted trailing frames and still supports a clean reconnect stream', async () => {
    const expectedEvents: TutorStreamEvent[] = [
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
          content: 'Tutor says $F=ma$',
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
    const interruptedPayload =
      serializeTutorStreamEvents(expectedEvents.slice(0, 3)) +
      'id: 4\nevent: tutor.completion\ndata: {"type":"completion"';
    const interruptedEvents: TutorStreamEvent[] = [];

    await expect(
      consumeTutorEventStream(
        new Response(interruptedPayload, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
          },
          status: 200,
        }),
        (event) => {
          interruptedEvents.push(event);
        },
      ),
    ).rejects.toThrow();
    expect(interruptedEvents).toEqual(expectedEvents.slice(0, 3));

    const reconnectedEvents: TutorStreamEvent[] = [];

    await consumeTutorEventStream(
      new Response(serializeTutorStreamEvents(expectedEvents), {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
        },
        status: 200,
      }),
      (event) => {
        reconnectedEvents.push(event);
      },
    );

    expect(reconnectedEvents).toEqual(expectedEvents);
  });
});
