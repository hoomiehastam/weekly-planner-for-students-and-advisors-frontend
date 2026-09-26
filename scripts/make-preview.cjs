// ساخت یک فایل HTML مستقل برای پیش‌نمایش: درون‌ریزی CSS و JS از dist
// نکته‌ی مهم: داخل JS باید `</script>` خنثی شود تا پارسر HTML تگ را زودتر نبندد.
// این نسخه دقیقاً همان assetهایی را درون‌ریزی می‌کند که خود index.html ارجاع می‌دهد.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// استخراج آدرس assetها از خود html (نه حدس زدن نام فایل)
const cssUrl = html.match(/href="(\/assets\/[^"]+\.css)"/)?.[1];
const jsUrl = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
if (!cssUrl || !jsUrl) {
  console.error('asset links not found in dist/index.html');
  process.exit(1);
}

const css = fs.readFileSync(path.join(dist, cssUrl), 'utf8');
let js = fs.readFileSync(path.join(dist, jsUrl), 'utf8');

// خنثی‌کردن دنباله‌هایی که پارسر HTML را گول می‌زنند
const before = js.split('</script').length - 1;
js = js.split('</script').join('<\\/script').split('<!--').join('<\\!--');
const after = js.split('</script').length - 1;
console.log('escape </script> — before:', before, 'after:', after);

// فقط تگ‌های asset خود vite را جایگزین کن (نه لینک فونت گوگل)
// نکته: replacer باید تابع باشد — اگر رشته باشد، الگوهای $& و $' داخل JS
// با متن جایگزین‌شده جایگزین می‌شوند و خروجی خراب می‌شود!
html = html.replace(
  new RegExp(`<link rel="stylesheet"[^>]*href="${cssUrl}"[^>]*>`),
  () => `<style>${css}</style>`
);
html = html.replace(
  new RegExp(`<script type="module"[^>]*src="${jsUrl}"[^>]*>[\\s\\S]*?<\/script>`),
  () => `<script type="module">${js}</script>`
);

const out = html;
fs.writeFileSync(path.join(__dirname, '..', 'preview-landing.html'), out);
console.log('preview written:', out.length, 'chars | css:', cssUrl, '| js:', jsUrl);
