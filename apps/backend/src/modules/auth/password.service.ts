import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordService {
  async hash(raw: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(raw, salt, 64)) as Buffer;
    return `${salt}.${derived.toString('hex')}`;
  }

  async verify(raw: string, stored: string): Promise<boolean> {
    const [salt, hashHex] = stored.split('.');
    if (!salt || !hashHex) {
      return false;
    }
    const derived = (await scrypt(raw, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(hashHex, 'hex');
    if (storedBuffer.length !== derived.length) {
      return false;
    }
    return timingSafeEqual(storedBuffer, derived);
  }
}
