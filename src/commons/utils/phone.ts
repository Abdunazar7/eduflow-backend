/**
 * The single canonical form for phone numbers: digits only.
 *
 * Login, the Telegram bot and user creation must all agree on this, otherwise
 * "+998 90 123 45 67" is stored with spaces by one path and can never be
 * matched by another.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
