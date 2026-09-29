import { toFaDigits } from './jalali';

// روزشمار تا تاریخ کنکور (YYYY-MM-DD) — عدد صحیح روز؛ منفی یعنی گذشته است.
export function daysUntilDate(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// متن آماده‌ی روزشمار: «۴۵ روز تا کنکور» — برای روز آزمون: «امروز کنکوره!»
export function konkurCountdownText(dateStr) {
  const days = daysUntilDate(dateStr);
  if (days == null) return null;
  if (days === 0) return 'امروز کنکوره!';
  if (days < 0) return null; // گذشته — نمایش نده
  return `${toFaDigits(days)} روز تا کنکور`;
}
