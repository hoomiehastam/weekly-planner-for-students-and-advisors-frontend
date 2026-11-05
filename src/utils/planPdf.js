// خروجی PDF مرتب برای برنامه‌ی مطالعاتی — بدون وابستگی خارجی.
//
// روش: یک «قالب» اختصاصی (صفحه‌ی A4 راست‌به‌چپ با سرصفحه‌ی برند، مشخصات کلی، خلاصه‌ی آمار و جدول روزها)
// ساخته می‌شود و فقط همین قالب چاپ می‌شود؛ کاربر در پنجره‌ی چاپ «ذخیره به‌صورت PDF» را می‌زند.
//
// چرا پنجره‌ی جدا؟ روش قبلی چاپ از داخل یک iframe مخفی بود. مرورگرهای آیفون (و سافاری)
// دستور چاپِ iframe را نادیده می‌گیرند و «کل صفحه‌ی سایت» را چاپ می‌کنند.
// چاپ از پنجره‌ی خودش همه‌جا فقط خود قالب را می‌گیرد. اگر مرورگر پنجره‌ی جدید را مسدود کند،
// به همان روش iframe برمی‌گردیم (روی رایانه درست کار می‌کند).

import { toFaDigits, formatJalaliShort, formatJalaliDate } from './jalali';
import { DAY_NAMES } from './dayNames';
import { dayTotalMinutes, formatDurationFa } from '../components/PlanBits';
import { topicLabel } from './planItem';

const C = {
  navy: '#1B1F3B',
  orange: '#E8643C',
  green: '#1B8A6B',
  greenSoft: '#DCF0E7',
  line: '#EDE3D3',
  lineSoft: '#F4EDE0',
  soft: '#6B7280',
  muted: '#9A9788',
};

// رنگ چیپ تگ‌های شناخته‌شده — هماهنگ با کانسپت‌ها
const TAG_STYLES = {
  پیشروی: { bg: '#EAF3DE', fg: '#3B6D11' },
  تمرین: { bg: '#F1EFE8', fg: '#5F5E5A' },
  مرور: { bg: '#FBE7D6', fg: '#B8501E' },
  آزمون: { bg: '#FCE3E3', fg: '#A32D2D' },
  استراحت: { bg: '#F4EDE0', fg: '#6B7280' },
};

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isIos() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function tagChip(name) {
  const st = TAG_STYLES[name] || { bg: '#F1EFE8', fg: '#5F5E5A' };
  return `<span class="chip" style="background:${st.bg};color:${st.fg}">${esc(name)}</span>`;
}

function faTime(t) {
  if (!t) return '';
  return toFaDigits(t);
}

// درصد پیشرفت — همان منطق computeProgress (بدون وابستگی به کامپوننت)
function planProgress(plan) {
  const all = (plan.days || []).flatMap((d) => d.items || []);
  if (all.length === 0) return 0;
  const done = all.filter((i) => i.status === 'DONE').length;
  return Math.round((done / all.length) * 100);
}

function itemRow(item) {
  const done = item.status === 'DONE';
  // ساعت شروع سمت راست و پایان سمت چپ (جهت خواندن فارسی)؛ bdi ترتیب را ثابت نگه می‌دارد
  const time =
    item.startTime || item.endTime
      ? `<bdi>${faTime(item.startTime || '—')}</bdi> – <bdi>${faTime(item.endTime || '—')}</bdi>`
      : '—';
  const tags = (item.tags || []).map((t) => tagChip(t.tag?.name || t.name || '')).join('');
  return `
    <tr>
      <td class="time">${time}</td>
      <td class="subject">
        ${esc(item.subject || 'بدون نام')}
        ${topicLabel(item) ? `<div class="topic">${esc(topicLabel(item))}</div>` : ''}
        ${item.description ? `<div class="desc">${esc(item.description)}</div>` : ''}
      </td>
      <td class="tags">${tags}</td>
      <td class="status">
        ${done ? '<span class="done">انجام شد</span>' : '<span class="todo">در انتظار</span>'}
      </td>
    </tr>`;
}

function daySection(day) {
  const items = day.items || [];
  const doneCount = items.filter((i) => i.status === 'DONE').length;
  const minutes = dayTotalMinutes(items);
  const rows =
    items.length === 0
      ? '<tr><td class="empty" colspan="4">بدون بازه‌ی مطالعاتی</td></tr>'
      : items.map(itemRow).join('');
  return `
    <section class="day">
      <div class="day-head">
        <span class="day-name">${DAY_NAMES[day.dayOfWeek] || ''}</span>
        <span class="day-count">
          ${toFaDigits(doneCount)} از ${toFaDigits(items.length)} انجام‌شده${minutes > 0 ? ` · ${formatDurationFa(minutes)}` : ''}
        </span>
      </div>
      <table class="items">${rows}</table>
    </section>`;
}

// mode: 'window' → با نوار ابزار (دکمه‌ی ذخیره/چاپ) و چاپ خودکار؛ 'frame' → فقط خود سند
function buildHtml(plan, { studentName, advisorName } = {}, mode = 'window') {
  const progress = planProgress(plan);
  const days = plan.days || [];
  const totalItems = days.reduce((s, d) => s + (d.items || []).length, 0);
  const doneItems = days.reduce(
    (s, d) => s + (d.items || []).filter((i) => i.status === 'DONE').length,
    0
  );
  const totalMinutes = days.reduce((s, d) => s + dayTotalMinutes(d.items || []), 0);
  const dates = [
    plan.startsAt ? `از ${formatJalaliShort(plan.startsAt)}` : '',
    plan.expiresAt ? `تا ${formatJalaliShort(plan.expiresAt)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const today = formatJalaliDate(new Date(), { withWeekday: false });

  const metaLines = [
    studentName ? `دانش‌آموز: ${esc(studentName)}` : '',
    advisorName ? `مشاور: ${esc(advisorName)}` : '',
    dates,
  ].filter(Boolean);

  const hint = isIos()
    ? 'در آیفون: دکمه‌ی زیر را بزن، در پنجره‌ی چاپ دو انگشتت را روی پیش‌نمایش باز کن و با دکمه‌ی اشتراک‌گذاری «ذخیره در فایل‌ها» را انتخاب کن.'
    : 'در پنجره‌ی چاپ، مقصد را «ذخیره به‌صورت PDF» بگذار و ذخیره کن.';

  const toolbar =
    mode === 'window'
      ? `<div class="toolbar no-print">
    <button id="printBtn" type="button">ذخیره به‌صورت PDF / چاپ</button>
    <button id="closeBtn" type="button" class="ghost">بستن</button>
    <p class="hint">${hint}</p>
  </div>`
      : '';

  const script =
    mode === 'window'
      ? `<script>
  (function () {
    var printBtn = document.getElementById('printBtn');
    var closeBtn = document.getElementById('closeBtn');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
    if (closeBtn) closeBtn.addEventListener('click', function () { window.close(); });
    // چاپ خودکار: منتظر رویداد load نمی‌مانیم، چون آن رویداد تا رسیدن استایل قلم از سرویس گوگل
    // صبر می‌کند و در شبکه‌ی کند یا مسدود خیلی دیر (یا هرگز) می‌آید. حداکثر ۲.۵ ثانیه برای قلم صبر می‌کنیم.
    // اگر مرورگر چاپ خودکار را اجازه نداد، دکمه‌ی بالای صفحه همیشه کار می‌کند.
    var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
    Promise.race([ready, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
      setTimeout(function () { try { window.print(); } catch (e) {} }, 150);
    });
  })();
</script>`
      : '';

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>برنامه‌ی ${esc(plan.title || 'مطالعاتی')} — دانش‌آموزینو</title>
<script>
  /* قلم وزیرمتن را بی‌صدا و بدون مسدودکردن اضافه می‌کنیم. اگر استایل قلم را مستقیم در head بگذاریم،
     مرورگر تا رسیدنش نه صفحه را نشان می‌دهد و نه کدهای صفحه را اجرا می‌کند؛ در شبکه‌ی کند یا
     مسدودِ سرویس گوگل، پنجره خالی می‌ماند. این‌طور اگر قلم نرسید، با قلم جایگزین (تاهوما) چاپ می‌شود. */
  (function () {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  })();
</script>
<style>
  @page { size: A4; margin: 13mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; color: ${C.navy}; margin: 0; background: #fff; font-size: 12px; line-height: 1.9; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid ${C.navy}; padding-bottom: 12px; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 9px; }
  .mark { width: 36px; height: 36px; border-radius: 10px; background: ${C.orange}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex: none; }
  .brand-name { font-weight: 700; font-size: 15px; line-height: 1.4; }
  .brand-sub { font-size: 10px; color: ${C.soft}; }
  .head-info { text-align: left; }
  .plan-title { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
  .plan-meta { font-size: 11px; color: ${C.soft}; margin: 0; }
  .progress-pill { background: ${C.navy}; color: #fff; border-radius: 20px; padding: 6px 14px; font-size: 11.5px; font-weight: 600; margin-top: 6px; display: inline-block; }
  .note { border: 1px dashed ${C.line}; background: ${C.lineSoft}; border-radius: 10px; padding: 8px 12px; margin-bottom: 14px; font-size: 11.5px; }
  .note b { font-weight: 700; }
  .summary { display: flex; gap: 8px; margin-bottom: 14px; }
  .sum-card { flex: 1; border: 1px solid ${C.line}; border-radius: 10px; padding: 8px 12px; }
  .sum-label { font-size: 10px; color: ${C.soft}; margin: 0; }
  .sum-value { font-size: 15px; font-weight: 700; margin: 0; }
  .day { border: 1px solid ${C.line}; border-radius: 10px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
  .day-head { display: flex; justify-content: space-between; align-items: center; background: ${C.lineSoft}; padding: 6px 12px; gap: 8px; }
  .day-name { font-weight: 700; font-size: 12.5px; }
  .day-count { font-size: 10.5px; color: ${C.soft}; background: #fff; border: 1px solid ${C.line}; border-radius: 12px; padding: 1px 10px; }
  table.items { width: 100%; border-collapse: collapse; }
  .items td { padding: 7px 12px; border-top: 1px solid ${C.lineSoft}; vertical-align: top; text-align: right; }
  .items tr:first-child td { border-top: none; }
  td.time { width: 105px; font-size: 11px; color: ${C.soft}; white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.subject { font-weight: 600; font-size: 12px; }
  td.subject .topic { font-weight: 500; font-size: 10.5px; color: #6B7280; margin-top: 2px; }
  .desc { font-weight: 400; color: ${C.soft}; font-size: 11px; }
  td.tags { width: 26%; }
  .chip { display: inline-block; border-radius: 12px; padding: 1px 9px; font-size: 10px; margin-left: 4px; }
  td.status { width: 82px; text-align: left; white-space: nowrap; }
  .done { color: ${C.green}; background: ${C.greenSoft}; border-radius: 10px; padding: 1px 8px; font-weight: 600; font-size: 10.5px; }
  .todo { color: ${C.muted}; font-size: 10.5px; }
  .empty { color: ${C.muted}; font-size: 11px; text-align: right; }
  .foot { margin-top: 16px; padding-top: 10px; border-top: 1px solid ${C.line}; display: flex; justify-content: space-between; gap: 12px; font-size: 10px; color: ${C.muted}; }

  /* ----- فقط روی صفحه‌ی نمایش (نه چاپ): نوار ابزار و پیش‌نمایش روی گوشی ----- */
  .toolbar { background: ${C.lineSoft}; border-bottom: 1px solid ${C.line}; padding: 10px 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .toolbar button { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 999px; border: none; background: ${C.navy}; color: #fff; cursor: pointer; }
  .toolbar button.ghost { background: #fff; color: ${C.navy}; border: 1px solid ${C.line}; }
  .toolbar .hint { flex-basis: 100%; margin: 2px 0 0; font-size: 11.5px; color: ${C.soft}; line-height: 1.8; }
  @media screen {
    .page { max-width: 860px; margin: 0 auto; padding: 16px; }
  }
  @media screen and (max-width: 640px) {
    .head { flex-direction: column; }
    .head-info { text-align: right; }
    .summary { flex-wrap: wrap; }
    .sum-card { flex-basis: calc(50% - 8px); }
    .foot { flex-direction: column; }
    td.time { width: auto; }
    td.tags { width: auto; }
    td.status { width: auto; }
    .items td { padding: 6px 8px; }
  }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>
  ${toolbar}
  <div class="page">
  <header class="head">
    <div class="brand">
      <div class="mark">د</div>
      <div>
        <div class="brand-name">دانش‌آموزینو</div>
        <div class="brand-sub">برنامه‌ی مطالعاتی</div>
      </div>
    </div>
    <div class="head-info">
      <h1 class="plan-title">${esc(plan.title || 'برنامه‌ی مطالعاتی')}</h1>
      <p class="plan-meta">${metaLines.join(' · ')}</p>
      <span class="progress-pill">پیشرفت: ${toFaDigits(progress)}٪</span>
    </div>
  </header>

  ${plan.note ? `<div class="note"><b>یادداشت مشاور:</b> ${esc(plan.note)}</div>` : ''}

  <div class="summary">
    <div class="sum-card"><p class="sum-label">مجموع بازه‌ها</p><p class="sum-value">${toFaDigits(totalItems)}</p></div>
    <div class="sum-card"><p class="sum-label">انجام‌شده</p><p class="sum-value" style="color:${C.green}">${toFaDigits(doneItems)}</p></div>
    <div class="sum-card"><p class="sum-label">باقی‌مانده</p><p class="sum-value" style="color:${C.orange}">${toFaDigits(Math.max(0, totalItems - doneItems))}</p></div>
    ${totalMinutes > 0 ? `<div class="sum-card"><p class="sum-label">جمع زمان برنامه</p><p class="sum-value" style="font-size:12px">${formatDurationFa(totalMinutes)}</p></div>` : ''}
    <div class="sum-card"><p class="sum-label">تاریخ تهیه</p><p class="sum-value" style="font-size:12px">${today}</p></div>
  </div>

  ${days.map(daySection).join('')}

  <footer class="foot">
    <span>مسیر موفقیت در کنکور با نظم شروع می‌شود، نه با تلاش یک‌روزه.</span>
    <span>daneshamoozino.ir — دانش‌آموزینو</span>
  </footer>
  </div>
  ${script}
</body>
</html>`;
}

// روش اصلی: قالب در پنجره‌ی جدید باز می‌شود و همان‌جا چاپ می‌شود (فقط خود قالب، نه کل سایت)
function openInWindow(html) {
  // باید همزمان با کلیک کاربر باز شود تا مسدود نشود
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

// روش جایگزین (اگر پنجره مسدود شد): iframe مخفی — روی رایانه درست کار می‌کند
function printInFrame(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'plan-pdf');
  iframe.style.position = 'fixed';
  iframe.style.inset = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  const fontsReady = doc.fonts?.ready ?? Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => iframe.remove(), 60_000);
    }
  });
}

// options: { studentName, advisorName }
export function downloadPlanPdf(plan, options = {}) {
  if (openInWindow(buildHtml(plan, options, 'window'))) return;
  printInFrame(buildHtml(plan, options, 'frame'));
}
