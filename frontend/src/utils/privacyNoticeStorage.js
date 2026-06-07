export const PRIVACY_STORAGE_KEY = 'echowing-privacy-notice-accepted';

export function isPrivacyNoticeAccepted() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markPrivacyNoticeAccepted() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRIVACY_STORAGE_KEY, 'true');
  } catch {
    // Storage blocked (private mode / embedded browser) — keep showing each session.
  }
}

export function clearPrivacyNoticeAccepted() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PRIVACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
