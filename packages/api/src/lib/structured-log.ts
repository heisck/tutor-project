type StructuredLogLevel = 'info' | 'warn' | 'error';

export function writeStructuredLog(
  level: StructuredLogLevel,
  event: string,
  fields: Record<string, unknown>,
): void {
  const entry = JSON.stringify({
    event,
    level,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  const stream =
    level === 'warn' || level === 'error' ? process.stderr : process.stdout;

  stream.write(`${entry}\n`);
}
