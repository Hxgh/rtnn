import { AppLogger } from './app-logger.service';

describe('AppLogger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prints structured payloads by default', () => {
    const logger = new AppLogger();
    const writes: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    logger.log({ event: 'test' }, 'AppLoggerSpec');

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('"level":"log"');
    expect(writes[0]).toContain('"context":"AppLoggerSpec"');
    expect(writes[0]).toContain('"message":"structured-log"');
  });

  it('suppresses output when muted', () => {
    const logger = new AppLogger();
    const writes: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    logger.setMuted(true);
    logger.error('should-not-print', undefined, 'AppLoggerSpec');

    expect(writes).toHaveLength(0);
  });
});
