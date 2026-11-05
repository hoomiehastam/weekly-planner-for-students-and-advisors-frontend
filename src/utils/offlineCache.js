// ذخیره‌ی محلیِ «آخرین برنامه‌ی دانش‌آموز» برای خواندن بدون اینترنت.
// قاعده‌ها:
//  - فقط برنامه‌ی هفتگی خود دانش‌آموز و اطلاعات پایه‌ی خودش ذخیره می‌شود (نه آزمون، نه چیزی از مشاور یا دانش‌آموزان دیگر)
//  - برای هر کاربر جدا نگه داشته می‌شود تا روی یک دستگاه با هم قاطی نشوند
//  - با خروج از حساب یا نامعتبر شدن جلسه، همه‌اش پاک می‌شود
//  - هر خطای حافظه (پر بودن، حالت خصوصی مرورگر) بی‌صدا نادیده گرفته می‌شود؛ سایت مثل قبل کار می‌کند
const PREFIX = 'dz:offline:v1:';
const USER_KEY = `${PREFIX}user`;
const plansKey = (userId) => `${PREFIX}plans:${userId}`;
const mockKey = (userId) => `${PREFIX}mock:${userId}`;

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* حافظه پر یا غیرفعال است */
  }
}

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOfflinePlans(userId, plans) {
  if (!userId) return;
  write(plansKey(userId), { savedAt: Date.now(), plans });
}

// { savedAt, plans } یا null
export function loadOfflinePlans(userId) {
  if (!userId) return null;
  const data = read(plansKey(userId));
  return data && Array.isArray(data.plans) ? data : null;
}

// نمرات آزمون‌های آزمایشیِ خود دانش‌آموز (فقط‌خواندنی بدون اینترنت)
export function saveOfflineMockScores(userId, scores) {
  if (!userId) return;
  write(mockKey(userId), { savedAt: Date.now(), scores });
}

// { savedAt, scores } یا null
export function loadOfflineMockScores(userId) {
  if (!userId) return null;
  const data = read(mockKey(userId));
  return data && Array.isArray(data.scores) ? data : null;
}

// آخرین کاربرِ دانش‌آموزِ واردشده — برای باز شدن پنل وقتی بررسی جلسه از سرور ممکن نیست
export function saveOfflineUser(user, access) {
  write(USER_KEY, { savedAt: Date.now(), user, access: access || null });
}

export function loadOfflineUser() {
  const data = read(USER_KEY);
  return data && data.user && data.user.id ? data : null;
}

export function clearOfflineData() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* مهم نیست */
  }
}
