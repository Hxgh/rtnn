import { BadRequestException } from '@nestjs/common';
import { ClientReleaseFactsParser } from './client-release-facts-parser.service';
import type { ClientReleaseFactsDto } from './dto/client-release-facts.dto';

describe('ClientReleaseFactsParser', () => {
  const parser = new ClientReleaseFactsParser();

  it('rejects unsupported facts schema versions with a stable code', () => {
    expect(() =>
      parser.parse({
        schemaVersion: 'rtnn.deploy.client-release-facts.v0',
        clients: {},
      } as ClientReleaseFactsDto),
    ).toThrow(BadRequestException);

    try {
      parser.parse({
        schemaVersion: 'rtnn.deploy.client-release-facts.v0',
        clients: {},
      } as ClientReleaseFactsDto);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'CLIENT_RELEASE_FACTS_UNSUPPORTED_SCHEMA',
        message: 'Unsupported client release facts schema',
        schemaVersion: 'rtnn.deploy.client-release-facts.v0',
      });
    }
  });

  it('rejects facts without packages with a stable code', () => {
    try {
      parser.parse({
        schemaVersion: 'rtnn.deploy.client-release-facts.v1',
        clients: {},
      } as ClientReleaseFactsDto);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'CLIENT_RELEASE_FACTS_EMPTY_PACKAGES',
        message: 'Client release facts do not contain packages',
      });
    }
  });
});
