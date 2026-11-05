// بعد از «vite build» اجرا می‌شود (در اسکریپت build). کار آن:
//  ۱) فهرست همه‌ی فایل‌های ساخته‌شده‌ی dist را داخل سرویس‌ورکر می‌گذارد تا برای استفاده‌ی بدون اینترنت از قبل ذخیره شوند
//  ۲) شناسه‌ی نسخه را از روی محتوای فایل‌ها می‌سازد؛ فقط وقتی چیزی واقعاً عوض شده باشد این شناسه عوض می‌شود
//     (پس پیام «نسخه‌ی جدید» بی‌دلیل نمایش داده نمی‌شود)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dist = path.join(__dirname, '..', 'dist');
const swPath = path.join(dist, 'sw.js');

if (!fs.existsSync(swPath)) {
  console.error('dist/sw.js پیدا نشد — اول vite build را اجرا کن.');
  process.exit(1);
}

const SKIP = new Set(['sw.js', '.htaccess', 'index.html', '.DS_Store']);

function walk(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return walk(path.join(dir, entry.name), rel);
    if (SKIP.has(entry.name) || entry.name.endsWith('.map')) return [];
    return [rel];
  });
}

const files = walk(dist).sort();
const hash = crypto.createHash('sha1');
// index.html هم در شناسه حساب می‌شود (چون به فایل‌های هش‌دار اشاره می‌کند)
for (const f of ['index.html', ...files]) {
  hash.update(f);
  hash.update(fs.readFileSync(path.join(dist, f)));
}
let sw = fs.readFileSync(swPath, 'utf8');
// خود کد سرویس‌ورکر هم در شناسه حساب می‌شود تا با تغییر منطق آن، حافظه‌ی نهان قدیمی دوباره ساخته شود
hash.update(sw);
const buildId = hash.digest('hex').slice(0, 12);

const hasPrecache = sw.includes('/*__PRECACHE__*/') && (sw.includes('/*__PRECACHE__*/[]') || sw.includes('/*__PRECACHE__*/ []'));

if (!sw.includes("'__BUILD_ID__'") || !hasPrecache) {
  console.error('علامت‌های جایگزینی در sw.js پیدا نشدند (شاید قبلاً مهر شده).');
  process.exit(1);
}
sw = sw
  .replace("'__BUILD_ID__'", () => JSON.stringify(buildId))
  .replace(/\/\*__PRECACHE\*\/\s*\[\]/, () => JSON.stringify(files.map((f) => `/${f}`)));
fs.writeFileSync(swPath, sw);

const totalKb = Math.round(
  files.reduce((s, f) => s + fs.statSync(path.join(dist, f)).size, 0) / 1024
);
console.log(`sw.js مهر شد — نسخه ${buildId}، ${files.length} فایل، حدود ${totalKb} کیلوبایت`);
