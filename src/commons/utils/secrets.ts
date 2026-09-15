import { createHash, randomInt, timingSafeEqual } from 'crypto';

// No 0/O or 1/l/I, so a password read off a phone screen is typed correctly.
const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Temporary password from a CSPRNG. Math.random is predictable. */
export function generateTempPassword(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

/** Six-digit numeric one-time code from a CSPRNG. */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * SHA-256 for long, high-entropy tokens such as refresh JWTs.
 *
 * bcrypt is the wrong tool here: it silently ignores everything after the
 * first 72 bytes, and the first 72 bytes of two JWTs for the same user are
 * identical, so a rotated-out refresh token would still compare as valid.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
