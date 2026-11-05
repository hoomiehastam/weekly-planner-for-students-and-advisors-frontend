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
  // صفحه راست‌به‌چپ است: ساعت شروع سمت راست و ساعت پایان سمت چپ می‌نشیند؛
  // پس فلش باید به چپ (←) اشاره کند. قبلاً «→» بود و از پایان به شروع نشان می‌داد.
  // dir="rtl" و <bdi> ترتیب را مستقل از متن اطراف ثابت نگه می‌دارند.
  return (
    <span className="time-pill" dir="rtl">
      <span className="time-icon">◷</span>
      {startTime && <bdi>{startTime}</bdi>}
      {startTime && endTime && <span className="time-pill-arrow" aria-hidden="true">←</span>}
      {endTime && <bdi>{endTime}</bdi>}
    </span>
  );
}

// حرف اول نام برای آواتار
export function getInitials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || '؟';
}

// جمع زمان بازه‌های ساعت‌دار یک روز، به دقیقه (بازه‌های بی‌ساعت یا نامعتبر حساب نمی‌شوند)
export function dayTotalMinutes(items) {
  return items.reduce((sum, it) => {
    if (!it.startTime || !it.endTime) return sum;
    const [sh, sm] = it.startTime.split(':').map(Number);
    const [eh, em] = it.endTime.split(':').map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return sum;
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff > 0 ? sum + diff : sum;
  }, 0);
}

// «۲ ساعت و ۳۰ دقیقه»
export function formatDurationFa(totalMin) {
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const fa = (n) => String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${fa(h)} ساعت و ${fa(m)} دقیقه`;
  if (h) return `${fa(h)} ساعت`;
  return `${fa(m)} دقیقه`;
}
