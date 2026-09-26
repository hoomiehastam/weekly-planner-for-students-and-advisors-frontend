// تبدیل تاریخ میلادی به شمسی (Jalali) — بدون وابستگی خارجی
// پیاده‌سازی مستقیم الگوریتم jalaali-js (MIT License)
// منبع: https://github.com/jalaali/jalaali-js

// تبدیل ارقام فارسی/عربی/لاتین از منبع واحد shared/fa-digits.mjs می‌آید
// تا با بک‌اند رفتار یکسانی داشته باشد (بدون تکرار کد).
import { toFaDigits, toLatinDigits } from '../../../shared/fa-digits.mjs';

export { toFaDigits, toLatinDigits };

// تقسیم صحیح
function div(a, b) {
  return ~~(a / b);
}

// باقی‌مانده
function mod(a, b) {
  return a - ~~(a / b) * b;
}

// سال‌های شروع دوره‌ی ۳۳ ساله در تقویم جلالی
const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

// آیا سال شمسی کبیسه است؟
function isLeapJalaaliYear(jy) {
  return jalCalLeap(jy) === 0;
}

// تعداد روزهای هر ماه شمسی
function jalaaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  if (isLeapJalaaliYear(jy)) return 30;
  return 29;
}

// محاسبه‌ی کبیسه بودن سال شمسی
function jalCalLeap(jy) {
  const bl = breaks.length;
  let jp = breaks[0];
  let jm, jump, leap, n;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error('Invalid Jalaali year ' + jy);
  }

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }
  n = jy - jp;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }
  return leap;
}

// محاسبه‌ی نقطه‌ی شروع سال شمسی (روز March میلادی) و کبیسه
function jalCal(jy, withoutLeap) {
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm, jump, leap, leapG, march, n;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error('Invalid Jalaali year ' + jy);
  }

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;

  if (withoutLeap) return { gy, march };

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

// تبدیل شمسی به روز ژولین
function j2d(jy, jm, jd) {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

// تبدیل روز ژولین به شمسی
function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);
  let jd, jm, k;

  k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

// تبدیل میلادی به روز ژولین
function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

// تبدیل روز ژولین به میلادی
function d2g(jdn) {
  let j, i, gd, gm, gy;
  j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  i = div(mod(j, 1461), 4) * 5 + 308;
  gd = div(mod(i, 153), 5) + 1;
  gm = mod(div(i, 153), 12) + 1;
  gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

// ---------- API عمومی ----------

// تبدیل میلادی به شمسی؛ ورودی می‌تواند Date یا (gy, gm, gd) باشد
function toJalaali(gy, gm, gd) {
  if (Object.prototype.toString.call(gy) === '[object Date]') {
    gd = gy.getDate();
    gm = gy.getMonth() + 1;
    gy = gy.getFullYear();
  }
  return d2j(g2d(gy, gm, gd));
}

// تبدیل شمسی به میلادی
function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

// تبدیل یک تاریخ (Date یا ISO string) به شمسی، خروجی به‌صورت آرایه‌ی [jy, jm, jd]
function toJalali(date) {
  const d = date instanceof Date ? date : new Date(date);
  const r = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return [r.jy, r.jm, r.jd];
}

// تبدیل شمسی به رشته‌ی YYYY-MM-DD میلادی برای input type=date
function jalaliToGregorianDate(jy, jm, jd) {
  const r = toGregorian(jy, jm, jd);
  const pad = (n) => String(n).padStart(2, '0');
  return `${r.gy}-${pad(r.gm)}-${pad(r.gd)}`;
}

const J_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

const WEEKDAY_NAMES = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

// قالب کامل: «شنبه، ۱۴ خرداد ۱۴۰۳»
function formatJalaliDate(date, options = {}) {
  const { withWeekday = true, withYear = true, faDigits = true } = options;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const jsDay = d.getDay();
  const jWeekday = (jsDay + 1) % 7;

  const [jy, jm, jd] = toJalali(d);

  const parts = [];
  if (withWeekday) parts.push(WEEKDAY_NAMES[jWeekday]);
  parts.push(`${faDigits ? toFaDigits(jd) : jd} ${J_MONTH_NAMES[jm - 1]}`);
  if (withYear) parts.push(faDigits ? toFaDigits(jy) : jy);

  return parts.join(' ');
}

// قالب کوتاه: «۱۴۰۳/۰۳/۱۴»
function formatJalaliShort(date, options = {}) {
  const { faDigits = true } = options;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const [jy, jm, jd] = toJalali(d);
  const pad = (n) => String(n).padStart(2, '0');
  const formatted = `${jy}/${pad(jm)}/${pad(jd)}`;
  return faDigits ? toFaDigits(formatted) : formatted;
}

// قالب کامل تاریخ و زمان: «شنبه، ۱۴ خرداد ۱۴۰۳ — ۱۴:۳۰»
function formatJalaliDateTime(date, options = {}) {
  const { faDigits = true } = options;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = formatJalaliDate(d, { faDigits: false });
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const time = `${hours}:${mins}`;
  return `${datePart} — ${faDigits ? toFaDigits(time) : time}`;
}

// قالب نسبی «چند وقت پیش»
function formatRelativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'همین الان';
  if (diffMin < 60) return `${toFaDigits(diffMin)} دقیقه پیش`;
  if (diffHour < 24) return `${toFaDigits(diffHour)} ساعت پیش`;
  if (diffDay === 1) return 'دیشب';
  if (diffDay < 7) return `${toFaDigits(diffDay)} روز پیش`;
  if (diffDay < 30) return `${toFaDigits(Math.floor(diffDay / 7))} هفته پیش`;
  return formatJalaliShort(d);
}

// محاسبه‌ی روز هفته‌ی شمسی (شنبه=0، جمعه=6)
// روش: تبدیل شمسی به میلادی، سپس getDay() و تبدیل.
// JS getDay: 0=یک‌شنبه، 6=شنبه. ما می‌خواهیم شنبه=0.
// تبدیل: (jsDay + 1) % 7
function getJalaliWeekday(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  const d = new Date(g.gy, g.gm - 1, g.gd);
  return (d.getDay() + 1) % 7;
}

export {
  toJalali,
  toJalaali,
  toGregorian,
  jalaliToGregorianDate,
  isLeapJalaaliYear,
  jalaaliMonthLength,
  getJalaliWeekday,
  formatJalaliDate,
  formatJalaliShort,
  formatJalaliDateTime,
  formatRelativeTime,
  J_MONTH_NAMES,
  WEEKDAY_NAMES,
};
