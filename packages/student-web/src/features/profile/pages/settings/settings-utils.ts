export const PHONE_STORAGE_KEY = 'xiaomai-user-phone';
export const PASSWORD_UPDATED_AT_STORAGE_KEY = 'xiaomai-password-updated-at';

function sanitizePhone(value: string) {
  const digitsOnly = value.replace(/\s+/g, '');
  if (!/^\d{11}$/.test(digitsOnly)) return null;
  return digitsOnly;
}

export function maskPhone(value: string | null) {
  const digitsOnly = value ? sanitizePhone(value) : null;
  if (!digitsOnly) return '138 **** 0000';
  return `${digitsOnly.slice(0, 3)} **** ${digitsOnly.slice(-4)}`;
}

export function readStoredPhone(storage: Storage | undefined) {
  if (!storage) return null;
  const raw = storage.getItem(PHONE_STORAGE_KEY);
  return raw ? sanitizePhone(raw) : null;
}

export function persistStoredPhone(value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PHONE_STORAGE_KEY, value);
}

export function normalizePhoneOrNull(value: string) {
  return sanitizePhone(value);
}

