// ابزارهای مشترک برای کار با «بازه‌ی درسی» که حالا سه فیلد جدا دارد:
// نام درس (subject)، فصل (chapter) و بخش (section).

import { DAY_NAMES } from './dayNames';

// حذف فاصله‌های اضافی و یکسان‌سازی نوشتار برای مقایسه و گروه‌بندی
export function normalizeName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

// کلید مقایسه: «ریاضی» و «ریاضی » (و حرف‌های عربی ي/ك) یکی حساب شوند
export function nameKey(value) {
  return normalizeName(value).replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

// «فصل ۳ · بخش ۲» (هر کدام که پر باشد)؛ اگر هیچ‌کدام پر نباشد رشته‌ی خالی
export function topicLabel(item) {
  const parts = [normalizeName(item?.chapter), normalizeName(item?.section)].filter(Boolean);
  return parts.join(' · ');
}

// نام کامل برای عنوان‌های کوتاه (تقویم، PDF): «ریاضی — فصل ۳ · بخش ۲»
export function fullItemTitle(item) {
  const subject = normalizeName(item?.subject) || 'بدون نام';
  const topic = topicLabel(item);
  return topic ? `${subject} — ${topic}` : subject;
}

function minutesOf(it) {
  if (!it.startTime || !it.endTime) return 0;
  const [sh, sm] = it.startTime.split(':').map(Number);
  const [eh, em] = it.endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

// خلاصه‌ی «هر درس چند بازه در این برنامه دارد».
// days: [{ dayOfWeek, enabled?, items: [{ subject, chapter, section, startTime, endTime }] }]
// خروجی: [{ key, name, count, minutes, dayNames: [..], topics: [..] }] به ترتیب اولین حضور در برنامه
export function summarizeLessons(days) {
  const map = new Map();
  const ordered = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  for (const d of ordered) {
    if (d.enabled === false) continue;
    for (const it of d.items || []) {
      const name = normalizeName(it.subject);
      if (!name) continue;
      const key = nameKey(name);
      if (!map.has(key)) {
        map.set(key, { key, name, count: 0, minutes: 0, dayNames: [], topics: [] });
      }
      const row = map.get(key);
      row.count += 1;
      row.minutes += minutesOf(it);
      const dn = DAY_NAMES[d.dayOfWeek];
      if (dn && !row.dayNames.includes(dn)) row.dayNames.push(dn);
      const t = topicLabel(it);
      if (t && !row.topics.includes(t)) row.topics.push(t);
    }
  }
  return Array.from(map.values());
}
