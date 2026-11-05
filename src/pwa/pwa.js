// منطق برنامه‌ی نصب‌شدنی (PWA): ثبت سرویس‌ورکر، دکمه‌ی نصب و اطلاع از نسخه‌ی جدید.
// یک مخزن کوچک خارج از ری‌اکت است و hook با نام usePwa به آن وصل می‌شود.

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // آیفون
  );
}

function detectIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIosDevice = /iphone|ipad|ipod/i.test(ua);
  // آیپدهای جدید خودشان را مک معرفی می‌کنند ولی لمسی‌اند
  const isIpadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isIosDevice || isIpadOs;
}

// نوع دستگاه/مرورگر برای نوشتن راهنمای نصب دستی: 'ios' | 'android' | 'firefox' | 'desktop'
export function getPlatform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (detectIos()) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/firefox/i.test(ua)) return 'firefox'; // فایرفاکس رایانه نصب برنامه‌ی وب ندارد
  return 'desktop';
}

let deferredPrompt = null;
let waitingWorker = null;
let userRequestedUpdate = false;
let started = false;

let state = {
  installed: detectStandalone(), // الان داخل برنامه‌ی نصب‌شده هستیم
  canPromptInstall: false, // مرورگر اجازه‌ی نمایش پنجره‌ی نصب را داده (اندروید و رایانه)
  isIos: detectIos(), // آیفون: باید دستی از منوی اشتراک‌گذاری نصب شود
  updateReady: false, // نسخه‌ی جدید دانلود شده و منتظر تأیید کاربر است
};

const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

// نمایش پنجره‌ی نصب مرورگر؛ true یعنی کاربر پذیرفت
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null; // هر رویداد فقط یک بار قابل استفاده است
  setState({ canPromptInstall: false });
  promptEvent.prompt();
  const choice = await promptEvent.userChoice.catch(() => null);
  return choice?.outcome === 'accepted';
}

// فعال‌کردن نسخه‌ی جدید و بارگذاری دوباره (فقط بعد از تأیید خود کاربر)
export function applyUpdate() {
  if (!waitingWorker) {
    window.location.reload();
    return;
  }
  userRequestedUpdate = true;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

function trackWorker(worker) {
  if (!worker) return;
  const markReady = () => {
    // اگر هنوز کنترل‌کننده‌ای نیست، این نصب اول است و نیازی به پیام نیست
    if (navigator.serviceWorker.controller) {
      waitingWorker = worker;
      setState({ updateReady: true });
    }
  };
  if (worker.state === 'installed') markReady();
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') markReady();
  });
}

export function initPwa() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // نمایش پنجره‌ی نصب را خودمان کنترل می‌کنیم
    deferredPrompt = e;
    setState({ canPromptInstall: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ installed: true, canPromptInstall: false });
  });

  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (e) => {
    setState({ installed: e.matches });
  });

  // سرویس‌ورکر فقط در نسخه‌ی نهایی (نه حالت توسعه) ثبت می‌شود
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // فقط وقتی کاربر خودش «به‌روزرسانی» را زده بارگذاری مجدد می‌کنیم
    if (!userRequestedUpdate || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (reg.waiting) trackWorker(reg.waiting);
        reg.addEventListener('updatefound', () => trackWorker(reg.installing));

        const check = () => reg.update().catch(() => {});
        // بررسی نسخه‌ی تازه وقتی کاربر به برنامه برمی‌گردد و هر ساعت
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) check();
        });
        setInterval(check, 60 * 60 * 1000);
      })
      .catch(() => {
        // ثبت نشد؛ سایت مثل قبل کار می‌کند
      });
  });
}
