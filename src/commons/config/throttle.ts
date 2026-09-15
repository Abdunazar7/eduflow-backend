import { createHash } from 'crypto';
import { normalizePhone } from '../utils/phone';

export const PER_MINUTE = 60_000;

/**
 * Signed-in requests are counted per session (a hash of the bearer token);
 * signed-out requests per IP. Counting everything per IP would throttle a
 * whole education centre together, because a classroom shares one public
 * address.
 *
 * An invented token only buys a bucket for requests the auth guard then
 * rejects, so this cannot be used to reach real data any faster.
 */
export function sessionOrIp(req: Record<string, any>): string {
  const auth: string | undefined = req.headers?.authorization;
  if (auth?.startsWith('Bearer ')) {
    return 'session:' + createHash('sha256').update(auth).digest('hex').slice(0, 32);
  }
  return 'ip:' + req.ip;
}

/**
 * For the auth routes: one bucket per phone number per network. Someone
 * guessing one account's password is stopped quickly, while classmates
 * logging in from the same router each keep their own allowance.
 */
export function phoneAndIp(req: Record<string, any>): string {
  const phone = normalizePhone(String(req.body?.phone ?? ''));
  return `phone:${req.ip}|${phone}`;
}
