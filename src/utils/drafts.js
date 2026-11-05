// ذخیره‌ی خودکار پیش‌نویس فرم‌ها در مرورگر (localStorage)
//
// اصول:
//  - کلید هر پیش‌نویس شامل شناسه‌ی کاربر است؛ کاربر دیگری روی همان دستگاه آن را نمی‌بیند
//  - پیش‌نویس تاریخ انقضا دارد (پیش‌فرض ۷ روز) تا داده‌ی کهنه برنگردد
//  - هر خطای حافظه (پر بودن، ممنوع بودن) بی‌صدا نادیده گرفته می‌شود؛ برنامه هرگز به‌خاطر آن خراب نمی‌شود
//  - هنگام خروج از حساب، همه‌ی پیش‌نویس‌ها پاک می‌شوند (دستگاه‌های مشترک)

const PREFIX = 'konkur-draft:v1:';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function draftKey(userId, scope) {
  return `${PREFIX}${userId}:${scope}`;
}

export function readDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed; // { data, meta, savedAt, expiresAt }
  } catch {
    return null;
  }
}

export function writeDraft(key, data, meta = null, ttlMs = DEFAULT_TTL_MS) {
  try {
    const now = Date.now();
    localStorage.setItem(
      key,
      JSON.stringify({ data, meta, savedAt: now, expiresAt: now + ttlMs })
    );
    return true;
  } catch {
    return false; // حافظه پر است یا در دسترس نیست
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* نادیده گرفته می‌شود */
  }
}

// فهرست پیش‌نویس‌های یک کاربر که کلیدشان با پیشوند داده‌شده شروع می‌شود
// مثلاً listDrafts(userId, 'plan:42:') ← همه‌ی پیش‌نویس‌های برنامه‌ی دانش‌آموز ۴۲
export function listDrafts(userId, scopePrefix = '') {
  const out = [];
  try {
    const full = draftKey(userId, scopePrefix);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(full)) {
        const d = readDraft(key);
        if (d) out.push({ key, scope: key.slice(draftKey(userId, '').length), ...d });
      }
    }
  } catch {
    /* نادیده گرفته می‌شود */
  }
  return out;
}

// پاک‌کردن همه‌ی پیش‌نویس‌ها (هنگام خروج از حساب)
export function clearAllDrafts() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* نادیده گرفته می‌شود */
  }
}
