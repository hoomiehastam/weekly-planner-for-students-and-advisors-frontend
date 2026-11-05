import { useSyncExternalStore } from 'react';

// ====== وضعیت راهنماهای تصویریِ درون‌بخشی ======
// هر بخشِ پنل می‌تواند یک کادر راهنما داشته باشد. کاربر می‌تواند همان بخش را
// ببندد یا همه‌ی راهنماها را برای همیشه پنهان کند. وضعیت هر کاربر جداگانه در
// localStorage نگه داشته می‌شود؛ پس روی هر دستگاه یک‌بار که بست، دیگر مزاحم نمی‌شود.
// متن‌ها با GUIDE_VERSION نسخه‌بندی می‌شوند: اگر راهنما را عوض اساسی کردی، عدد را
// بالا ببر تا برای همه یک بار دیگر نمایش داده شود.

const GUIDE_VERSION = 1;
const storageKey = (userId) => `dz:section-guides:v${GUIDE_VERSION}:${userId}`;

const EMPTY = { hidden: false, dismissed: {} };
const cache = new Map(); // userId -> state
const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, dismissed: {} };
  return {
    hidden: raw.hidden === true,
    dismissed: raw.dismissed && typeof raw.dismissed === 'object' ? { ...raw.dismissed } : {},
  };
}

function getState(userId) {
  if (!userId) return EMPTY;
  if (cache.has(userId)) return cache.get(userId);
  let state = { ...EMPTY, dismissed: {} };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) state = normalize(JSON.parse(raw));
  } catch {
    /* حالت خصوصی مرورگر یا داده‌ی خراب — پیش‌فرض */
  }
  cache.set(userId, state);
  return state;
}

function setState(userId, next) {
  if (!userId) return;
  cache.set(userId, next);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* مهم نیست — فقط در همین نشست اعمال می‌شود */
  }
  emit();
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// هوک وضعیت راهنماها برای کاربر جاری
export function useSectionGuides(userId) {
  const state = useSyncExternalStore(
    subscribe,
    () => getState(userId),
    () => EMPTY
  );
  return {
    ...state,
    isVisible: (key) => !state.hidden && !state.dismissed[key],
  };
}

// بستن یک بخش (فقط همان بخش)
export function dismissSectionGuide(userId, key) {
  const state = getState(userId);
  setState(userId, { ...state, dismissed: { ...state.dismissed, [key]: true } });
}

// پنهان‌کردن همه‌ی راهنماها برای همیشه
export function hideAllSectionGuides(userId) {
  const state = getState(userId);
  setState(userId, { ...state, hidden: true });
}

// برگرداندن همه‌ی راهنماها
export function showAllSectionGuides(userId) {
  setState(userId, { ...EMPTY, dismissed: {} });
}
