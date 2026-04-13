import { AppLogger } from './app-logger.service';

describe('AppLogger', () => {
  const stdoutWrite = process.stdout.write;

  afterEach(() => {
    process.stdout.write = stdoutWrite;
  });

  it('prints structured payloads by default', () => {
    const logger = new AppLogger();
    const writes: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    logger.log({ event: 'test' }, 'AppLoggerSpec');

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('"level":"log"');
    expect(writes[0]).toContain('"context":"AppLoggerSpec"');
    expect(writes[0]).toContain('"message":"structured-log"');
  });

  it('suppresses output when muted', () => {
    const logger = new AppLogger();
    const writes: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    logger.setMuted(true);
    logger.error('should-not-print', undefined, 'AppLoggerSpec');

    expect(writes).toHaveLength(0);
  });
});
