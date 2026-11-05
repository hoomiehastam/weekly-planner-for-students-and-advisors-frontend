// ابزارهای مشترک داده‌ی مطالعه: روزِ هر لاگ، برنامه‌ریزی‌شده‌ی هر تاریخ، آخرین پیشروی هر درس

import { nameKey, normalizeName } from './planItem';

const pad = (n) => String(n).padStart(2, '0');

// «YYYY-MM-DD» (تقویم محلیِ دستگاه) برای یک Date
export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// «YYYY-MM-DD» → Date محلیِ ظهر (ظهر تا جابه‌جایی ساعت، روز را عوض نکند)
export function keyToDate(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

// روزی که یک لاگ به آن تعلق دارد: studyDay سرور (روز همان بازه)، وگرنه روز ثبت (لاگ‌های خیلی قدیمی)
export function logDayKey(log) {
  if (log?.studyDay && /^\d{4}-\d{2}-\d{2}$/.test(log.studyDay)) return log.studyDay;
  const t = log?.createdAt ? new Date(log.createdAt) : null;
  return t && !Number.isNaN(t.getTime()) ? dateKey(t) : null;
}

export function slotMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

// تاریخِ شروع/پایانِ برنامه به «روزِ محلی»
function planDayRange(plan) {
  const start = plan.startsAt ? dateKey(new Date(plan.startsAt)) : null;
  const end = plan.expiresAt ? dateKey(new Date(plan.expiresAt)) : null;
  return { start, end };
}

// زمانِ «برنامه‌ریزی‌شده» برای یک تاریخ: بازه‌های همه‌ی برنامه‌هایی که آن تاریخ داخل بازه‌ی شروع تا پایانشان است
// و روز هفته‌شان با آن تاریخ می‌خواند. (قبلاً بازه‌ی همه‌ی برنامه‌ها — حتی برنامه‌های هفته‌های دیگر —
// روی هم جمع می‌شد و ساعت‌ها بیشتر از واقعیت نشان داده می‌شد.)
export function plannedMinutesForDate(plans, key) {
  const d = keyToDate(key);
  const weekday = (d.getDay() + 1) % 7;
  let total = 0;
  for (const plan of plans) {
    const { start, end } = planDayRange(plan);
    if (start && key < start) continue;
    if (end && key > end) continue;
    for (const day of plan.days || []) {
      if (day.dayOfWeek !== weekday) continue;
      for (const it of day.items || []) total += slotMinutes(it.startTime, it.endTime);
    }
  }
  return total;
}

// آخرین پیشروی هر درس از روی ردیف‌های SubjectProgress (جدیدترین روز اول)
// خروجی: [{ key, subject, position, studyDay }] به ترتیب جدیدترین
export function latestProgressBySubject(rows = []) {
  const map = new Map();
  for (const r of rows) {
    const key = nameKey(r.subject);
    const prev = map.get(key);
    if (!prev || r.studyDay > prev.studyDay) {
      map.set(key, { key, subject: normalizeName(r.subject), position: r.position, studyDay: r.studyDay });
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.studyDay < b.studyDay ? 1 : -1));
}

// همان قاعده‌ی سرور (resolveStudyDay) برای نمایش در کلاینت: «برای کدام تاریخ» ثبت می‌شود؟
//   آخرین وقوعِ روز هفته‌ی بازه که از امروز جلوتر نباشد و قبل از شروع برنامه نباشد؛
//   وگرنه اولین وقوع بعد از شروع (حداکثر تا امروز).
export function resolveStudyDayLocal(plan, dayOfWeek, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const todayIdx = (today.getDay() + 1) % 7;
  const diff = (todayIdx - dayOfWeek + 7) % 7;
  const cand = new Date(today);
  cand.setDate(cand.getDate() - diff);
  const candKey = dateKey(cand);
  const startKey = plan?.startsAt ? dateKey(new Date(plan.startsAt)) : null;
  if (!startKey || candKey >= startKey) return candKey;
  const start = keyToDate(startKey);
  const startIdx = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() + ((dayOfWeek - startIdx + 7) % 7));
  const firstKey = dateKey(start);
  return firstKey > dateKey(today) ? dateKey(today) : firstKey;
}
