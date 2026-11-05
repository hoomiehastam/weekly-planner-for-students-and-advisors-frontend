/* سرویس‌ورکر دانش‌آموزینو
 *
 * قاعده‌های ساده و ایمن:
 *  - فقط فایل‌های ثابتِ خود سایت (کد، استایل، قلم‌ها، آیکون‌ها) نگه‌داری می‌شوند تا برنامه بدون اینترنت هم باز شود.
 *  - درخواست‌های بک‌اند (آدرس دیگر) و هر درخواستی جز خواندن (GET) هرگز دست‌کاری نمی‌شوند؛
 *    پس هیچ داده‌ی برنامه، آزمون یا حساب کاربری‌ای در حافظه‌ی نهان نمی‌ماند.
 *  - بعد از هر انتشار، دو علامت زیر را اسکریپت scripts/stamp-sw.cjs پر می‌کند (دستی دست نزن).
 */
const BUILD_ID = "3bc540f3077c";
const PRECACHE_URLS = /*__PRECACHE__*/ [];

const STATIC_CACHE = `static-${BUILD_ID}`;
const FONT_CACHE = 'fonts-v1';
const NAV_TIMEOUT_MS = 5000;
// همان آدرس قلم داخل index.html — برای نگه‌داشتن قلم از قبل (تا اولین بار هم بدون اینترنت درست دیده شود)
const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap';

// آدرس‌های همسایِ فایل‌های ساخته‌شده را از روی خود index.html پیدا می‌کند (script، لینک استایل، آیکون).
// این کار تضمین می‌کند حتی اگر فهرست مهرشده خالی یا قدیمی باشد، فایل‌های واقعی صفحه از قبل ذخیره شوند.
function discoverShellUrls(html) {
  const found = new Set();
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], self.location.origin);
      if (
        u.origin === self.location.origin &&
        u.pathname !== '/' &&
        !u.pathname.startsWith('/api/')
      ) {
        found.add(u.pathname);
      }
    } catch {
      /* آدرس نامعتبر؛ نادیده */
    }
  }
  return [...found];
}

// قلم‌های گوگل را (بدون اینکه نصب را خراب کند) از قبل ذخیره می‌کند
async function precacheFonts() {
  try {
    const cache = await caches.open(FONT_CACHE);
    const cssResponse = await fetch(FONT_CSS_URL, { mode: 'cors' });
    if (!cssResponse.ok) return;
    const css = await cssResponse.clone().text();
    await cache.put(FONT_CSS_URL, cssResponse);
    const fontUrls = [
      ...new Set(
        [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((x) => x[1])
      ),
    ];
    await Promise.all(
      fontUrls.map(async (u) => {
        try {
          if (await cache.match(u)) return;
          const r = await fetch(u, { mode: 'cors' });
          if (r.ok) await cache.put(u, r);
        } catch {
          /* یک فایل قلم نیامد؛ بقیه ادامه دارند */
        }
      })
    );
  } catch {
    /* بدون اینترنت یا مسدود؛ برنامه با قلم سیستم هم کار می‌کند */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // «/» همان index.html است؛ با cache:'reload' از حافظه‌ی نهان مرورگر رد می‌شود تا نسخه‌ی تازه ذخیره شود
      const indexResponse = await fetch(new Request('/', { cache: 'reload' }));
      if (!indexResponse.ok) throw new Error('index.html در دسترس نیست');
      const html = await indexResponse.clone().text();
      await cache.put('/', indexResponse);

      // فهرست مهرشده‌ی اسکریپت ساخت + هر آدرسی که خود index.html به آن اشاره می‌کند
      const urls = [...new Set([...PRECACHE_URLS, ...discoverShellUrls(html)])].filter(
        (u) => u !== '/'
      );
      // یک فایل ناموجود نباید کل نصب را خراب کند؛ ولی فایل‌های اصلی صفحه باید حتماً ذخیره شوند
      const results = await Promise.all(
        urls.map(async (u) => {
          try {
            const r = await fetch(new Request(u, { cache: 'reload' }));
            // سرورهایی که برای مسیر ناموجود همان index.html را می‌دهند، نباید به‌جای فایل ذخیره شوند
            const type = r.headers.get('content-type') || '';
            const isHtmlFallback = /text\/html/i.test(type) && !u.endsWith('.html');
            if (!r.ok || isHtmlFallback) return { u, ok: false };
            await cache.put(u, r);
            return { u, ok: true };
          } catch {
            return { u, ok: false };
          }
        })
      );
      const missingCore = results.some((x) => !x.ok && /\/assets\/.+\.(js|css)$/.test(x.u));
      if (missingCore) throw new Error('فایل‌های اصلی برنامه کامل ذخیره نشدند'); // نصب ناقص نشود؛ بار بعد دوباره تلاش می‌شود

      // قلم‌ها پشت صحنه؛ منتظرشان نمی‌مانیم که نصب دیر نشود
      event.waitUntil(precacheFonts());
      // عمداً skipWaiting نمی‌زنیم: کاربر وسط نوشتن برنامه نباید ناگهان نسخه عوض شود.
      // برنامه خودش پیام «نسخه‌ی جدید آماده است» را نشان می‌دهد و با تأیید کاربر فعال می‌شود.
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('static-') && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// صفحه‌ی اصلی: اول شبکه (همیشه تازه‌ترین نسخه)، اگر نبود، کند بود یا خطای سرور داد، پوسته‌ی ذخیره‌شده
async function handleNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    // سرور در دسترس است ولی خراب است (۵xx / صفحه‌ی خطای هاست): پوسته‌ی ذخیره‌شده بهتر از صفحه‌ی خطاست
    if (response.status >= 500) {
      const cachedShell = await cache.match('/');
      if (cachedShell) return cachedShell;
    }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await cache.match('/');
    if (cached) return cached;
    return new Response(
      '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>بدون اینترنت</title><body style="font-family:sans-serif;text-align:center;padding:48px 20px">' +
        '<h2>اتصال به اینترنت برقرار نیست</h2><p>یک بار با اینترنت وارد شو تا برنامه برای استفاده‌ی بدون اینترنت ذخیره شود.</p>' +
        '<button onclick="location.reload()" style="padding:10px 20px;font-size:16px">تلاش دوباره</button></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// فایل‌های ثابت: اول حافظه‌ی نهان، اگر نبود از شبکه گرفته و نگه‌داری می‌شود
async function handleStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const type = response.headers.get('content-type') || '';
    // جواب جایگزین سرور (index.html برای مسیر ناموجود) را به‌جای فایل ذخیره نمی‌کنیم
    const isHtmlFallback = request.destination !== 'document' && /text\/html/i.test(type);
    if (response.ok && !isHtmlFallback) cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error(); // بدون اینترنت و ذخیره‌نشده؛ خطای عادی شبکه (بدون پرتاب خطای ناخواسته)
  }
}

// قلم‌های گوگل: نسخه‌ی ذخیره‌شده فوری نشان داده می‌شود و پشت صحنه تازه می‌شود
async function handleFonts(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(handleFonts(request));
    return;
  }

  // هر آدرس دیگر (از جمله بک‌اند روی دامنه‌ی دیگر) و مسیر api دست‌نخورده می‌ماند
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleStatic(request));
});
