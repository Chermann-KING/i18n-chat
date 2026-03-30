import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/** AES-256-GCM — authenticated encryption with 96-bit IV and 128-bit auth tag. */
const ALGORITHM = 'aes-256-gcm' as const;
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Application-layer encryption service using AES-256-GCM.
 *
 * Encrypted values are stored as `<iv_hex>:<authTag_hex>:<ciphertext_hex>`.
 * The key is read from `ENCRYPTION_KEY` (64 hex characters = 32 bytes).
 *
 * Usage: inject where personal data (email, phone) must be stored at rest.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const hex = config.getOrThrow<string>('ENCRYPTION_KEY');
    this.key = Buffer.from(hex, 'hex');
    if (this.key.length !== KEY_BYTES) {
      throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
    }
  }

  /**
   * Encrypts a UTF-8 plaintext string.
   *
   * @param plaintext - The value to encrypt.
   * @returns `iv:authTag:ciphertext` as a hex-encoded string.
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
  }

  /**
   * Decrypts a value produced by {@link encrypt}.
   *
   * Falls back to returning the raw value if it is not in the expected format,
   * allowing graceful handling of any pre-encryption legacy data.
   *
   * @param encrypted - The `iv:authTag:ciphertext` string.
   * @returns The original UTF-8 plaintext.
   */
  decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) return encrypted; // legacy plaintext fallback
    const [ivHex, authTagHex, ciphertextHex] = parts;
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const ciphertext = Buffer.from(ciphertextHex, 'hex');
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      return encrypted; // tampered or legacy — return as-is
    }
  }
}
