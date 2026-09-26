// تابع‌ها و قطعات UI مشترک بین داشبوردها (دانش‌آموز و مشاور)
// برای جلوگیری از تکرار کد، این‌ها از داشبوردها حذف و به اینجا منتقل شده‌اند.

// درصد درس‌های انجام‌شده
export function computeProgress(plan) {
  const allItems = plan.days.flatMap((d) => d.items);
  if (allItems.length === 0) return 0;
  const done = allItems.filter((i) => i.status === 'DONE').length;
  return Math.round((done / allItems.length) * 100);
}

// تگ ساعت شروع/پایان
export function TimeBadge({ startTime, endTime }) {
  if (!startTime && !endTime) return null;
  const label = [startTime, endTime].filter(Boolean).join(' → ');
  return (
    <span className="time-pill">
      <span className="time-icon">◷</span>
      {label}
    </span>
  );
}

// حرف اول نام برای آواتار
export function getInitials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || '؟';
}