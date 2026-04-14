import {
  tutorStreamEventSchema,
  type TutorStreamEvent,
} from '@ai-tutor-pwa/shared';

export interface ParsedTutorStreamFrameBatch {
  events: TutorStreamEvent[];
  remainder: string;
}

export function parseTutorStreamFrames(
  input: string,
): ParsedTutorStreamFrameBatch {
  const normalizedInput = input.replace(/\r\n/g, '\n');
  const frames = normalizedInput.split('\n\n');
  const remainder = normalizedInput.endsWith('\n\n') ? '' : (frames.pop() ?? '');
  const events: TutorStreamEvent[] = [];

  for (const frame of frames) {
    const trimmedFrame = frame.trim();

    if (trimmedFrame.length === 0) {
      continue;
    }

    const dataLine = trimmedFrame
      .split('\n')
      .find((line) => line.startsWith('data: '));

    if (dataLine === undefined) {
      throw new Error('Tutor SSE frame is missing a data payload');
    }

    const payload = JSON.parse(dataLine.slice('data: '.length)) as unknown;
    events.push(tutorStreamEventSchema.parse(payload));
  }

  return {
    events,
    remainder,
  };
}

export async function consumeTutorEventStream(
  response: Response,
  onEvent: (event: TutorStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (response.body === null) {
    throw new Error('Tutor stream response did not include a readable body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted === true) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsedBatch = parseTutorStreamFrames(buffer);
      buffer = parsedBatch.remainder;

      for (const event of parsedBatch.events) {
        onEvent(event);
      }
    }

    buffer += decoder.decode();
    const tail = buffer.trim();

    if (tail.length === 0) {
      return;
    }

    const parsedTail = parseTutorStreamFrames(`${tail}\n\n`);

    for (const event of parsedTail.events) {
      onEvent(event);
    }
  } finally {
    reader.releaseLock();
  }
}
