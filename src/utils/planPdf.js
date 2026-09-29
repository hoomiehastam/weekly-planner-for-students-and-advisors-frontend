// خروجی PDF مرتب برای برنامه‌ی مطالعاتی — بدون وابستگی خارجی.
// روش: ساخت یک سند HTML چاپی (A4, RTL, وزیرمتن) در یک iframe مخفی و فراخوانی print().
// کاربر در دیالوگ چاپ گزینه‌ی «ذخیره به‌صورت PDF» را انتخاب می‌کند و خروجی،
// یک PDF برداری با متن فارسی تمیز و چیدمان منظم خواهد بود (برخلاف عکس/اسکرین‌شات).
// طراحی سند از همان پالت کانسپت (کرم/سرمه‌ای/نارنجی) پیروی می‌کند.

import { toFaDigits, formatJalaliShort, formatJalaliDate } from './jalali';
import { DAY_NAMES } from './dayNames';

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
  const time =
    item.startTime || item.endTime
      ? `${faTime(item.startTime || '—')} – ${faTime(item.endTime || '—')}`
      : '—';
  const tags = (item.tags || []).map((t) => tagChip(t.tag?.name || t.name || '')).join('');
  return `
    <tr>
      <td class="time">${time}</td>
      <td class="subject">
        ${esc(item.subject || 'بدون نام')}
        ${item.description ? `<div class="desc">${esc(item.description)}</div>` : ''}
      </td>
      <td class="tags">${tags}</td>
      <td class="status">
        ${done ? '<span class="done">✓ انجام شد</span>' : '<span class="todo">○ در انتظار</span>'}
      </td>
    </tr>`;
}

function daySection(day) {
  const items = day.items || [];
  const doneCount = items.filter((i) => i.status === 'DONE').length;
  const rows =
    items.length === 0
      ? '<tr><td class="empty" colspan="4">بدون بازه‌ی مطالعاتی</td></tr>'
      : items.map(itemRow).join('');
  return `
    <section class="day">
      <div class="day-head">
        <span class="day-name">${DAY_NAMES[day.dayOfWeek] || ''}</span>
        <span class="day-count">${toFaDigits(doneCount)} از ${toFaDigits(items.length)} انجام‌شده</span>
      </div>
      <table class="items">${rows}</table>
    </section>`;
}

function buildHtml(plan, studentName) {
  const progress = planProgress(plan);
  const totalItems = (plan.days || []).reduce((s, d) => s + (d.items || []).length, 0);
  const doneItems = (plan.days || []).reduce(
    (s, d) => s + (d.items || []).filter((i) => i.status === 'DONE').length,
    0
  );
  const dates = [
    plan.startsAt ? `از ${formatJalaliShort(plan.startsAt)}` : '',
    plan.expiresAt ? `تا ${formatJalaliShort(plan.expiresAt)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const today = formatJalaliDate(new Date(), { withWeekday: false });

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>برنامه‌ی ${esc(plan.title)} — دانش‌آموزینو</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 13mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; color: ${C.navy}; margin: 0; background: #fff; font-size: 12px; line-height: 1.9; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid ${C.navy}; padding-bottom: 12px; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 9px; }
  .mark { width: 36px; height: 36px; border-radius: 10px; background: ${C.orange}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
  .brand-name { font-weight: 700; font-size: 15px; line-height: 1.4; }
  .brand-sub { font-size: 10px; color: ${C.soft}; }
  .head-info { text-align: left; }
  .plan-title { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
  .plan-meta { font-size: 11px; color: ${C.soft}; margin: 0; }
  .progress-pill { background: ${C.navy}; color: #fff; border-radius: 20px; padding: 6px 14px; font-size: 11.5px; font-weight: 600; margin-top: 6px; display: inline-block; }
  .summary { display: flex; gap: 8px; margin-bottom: 14px; }
  .sum-card { flex: 1; border: 1px solid ${C.line}; border-radius: 10px; padding: 8px 12px; }
  .sum-label { font-size: 10px; color: ${C.soft}; margin: 0; }
  .sum-value { font-size: 15px; font-weight: 700; margin: 0; }
  .day { border: 1px solid ${C.line}; border-radius: 10px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; }
  .day-head { display: flex; justify-content: space-between; align-items: center; background: ${C.lineSoft}; padding: 6px 12px; }
  .day-name { font-weight: 700; font-size: 12.5px; }
  .day-count { font-size: 10.5px; color: ${C.soft}; background: #fff; border: 1px solid ${C.line}; border-radius: 12px; padding: 1px 10px; }
  table.items { width: 100%; border-collapse: collapse; }
  .items td { padding: 7px 12px; border-top: 1px solid ${C.lineSoft}; vertical-align: top; text-align: right; }
  .items tr:first-child td { border-top: none; }
  td.time { width: 105px; font-size: 11px; color: ${C.soft}; white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.subject { font-weight: 600; font-size: 12px; }
  .desc { font-weight: 400; color: ${C.soft}; font-size: 11px; }
  td.tags { width: 26%; }
  .chip { display: inline-block; border-radius: 12px; padding: 1px 9px; font-size: 10px; margin-right: 4px; }
  td.status { width: 82px; text-align: left; white-space: nowrap; }
  .done { color: ${C.green}; background: ${C.greenSoft}; border-radius: 10px; padding: 1px 8px; font-weight: 600; font-size: 10.5px; }
  .todo { color: ${C.muted}; font-size: 10.5px; }
  .empty { color: ${C.muted}; font-size: 11px; text-align: right; }
  .foot { margin-top: 16px; padding-top: 10px; border-top: 1px solid ${C.line}; display: flex; justify-content: space-between; gap: 12px; font-size: 10px; color: ${C.muted}; }
</style>
</head>
<body>
  <header class="head">
    <div class="brand">
      <div class="mark">د</div>
      <div>
        <div class="brand-name">دانش‌آموزینو</div>
        <div class="brand-sub">برنامه‌ی مطالعاتی فعال</div>
      </div>
    </div>
    <div class="head-info">
      <h1 class="plan-title">${esc(plan.title || 'برنامه‌ی مطالعاتی')}</h1>
      <p class="plan-meta">
        ${studentName ? `دانش‌آموز: ${esc(studentName)}` : ''}${studentName && dates ? ' · ' : ''}${dates}
      </p>
      <span class="progress-pill">پیشرفت: ${toFaDigits(progress)}٪</span>
    </div>
  </header>

  <div class="summary">
    <div class="sum-card"><p class="sum-label">مجموع بازه‌ها</p><p class="sum-value">${toFaDigits(totalItems)}</p></div>
    <div class="sum-card"><p class="sum-label">انجام‌شده</p><p class="sum-value" style="color:${C.green}">${toFaDigits(doneItems)}</p></div>
    <div class="sum-card"><p class="sum-label">باقی‌مانده</p><p class="sum-value" style="color:${C.orange}">${toFaDigits(Math.max(0, totalItems - doneItems))}</p></div>
    <div class="sum-card"><p class="sum-label">تاریخ تهیه</p><p class="sum-value" style="font-size:12px">${today}</p></div>
  </div>

  ${(plan.days || []).map(daySection).join('')}

  <footer class="foot">
    <span>مسیر موفقیت در کنکور با نظم شروع می‌شود، نه با تلاش یک‌روزه.</span>
    <span>دانش‌آموزینو — daneshamoozino</span>
  </footer>
</body>
</html>`;
}

// ساخت سند در iframe مخفی و بازکردن دیالوگ چاپ (ذخیره به‌صورت PDF)
export function downloadPlanPdf(plan, { studentName } = {}) {
  const html = buildHtml(plan, studentName);
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
  // صبر برای آماده‌شدن فونت وزیرمتن تا خروجی PDF با فونت درست چاپ شود (با سقف زمانی)
  const fontsReady = doc.fonts?.ready ?? Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
    try {
      win.focus();
      win.print();
    } finally {
      // iframe بعد از چاپ پاک می‌شود (تأخیر امن)
      setTimeout(() => iframe.remove(), 60_000);
    }
  });
}
