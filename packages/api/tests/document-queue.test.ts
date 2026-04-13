import { describe, expect, it } from 'vitest';

import { buildRedisConnectionOptions } from '../src/documents/queue.js';

describe('document processing queue connection options', () => {
  it('parses a standard redis url', () => {
    expect(buildRedisConnectionOptions('redis://localhost:6379/0')).toEqual({
      db: 0,
      host: 'localhost',
      password: undefined,
      port: 6379,
      tls: undefined,
      username: undefined,
    });
  });

  it('preserves TLS and auth settings for secure redis providers', () => {
    expect(
      buildRedisConnectionOptions(
        'rediss://default:secret@example.upstash.io:6380/1',
      ),
    ).toEqual({
      db: 1,
      host: 'example.upstash.io',
      password: 'secret',
      port: 6380,
      tls: {},
      username: 'default',
    });
  });
});
