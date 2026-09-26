import { toFaDigits } from '../../utils/jalali';
import { getInitials } from '../PlanBits';
import StatCard from '../StatCard';

// بخش کارت‌های آمار، نوار پیشرفت هدف هفتگی، و کارت تماس مشاور.
// همه‌ی داده‌ها از والد می‌آید؛ هیچ state/تعاملِ پیچیده‌ای اینجا نیست.
// props:
//   stats       { activePlans, doneToday, studyHours, totalTests, totalMinutes }
//   weeklyGoal  minutes یا null
//   goalProgress  درصد ۰ تا ۱۰۰
//   advisor     اطلاعات مشاور یا null
export default function StudentStatsSection({ stats, weeklyGoal, goalProgress, advisor }) {
  return (
    <>
      {/* کارت‌های آمار */}
      <section className="stats-grid">
        <StatCard icon="📚" label="برنامه‌های فعال" value={toFaDigits(stats.activePlans)} accent="indigo" />
        <StatCard icon="✓" label="درس‌های انجام‌شده" value={toFaDigits(stats.doneToday)} accent="sage" />
        <StatCard icon="⏱" label="ساعت مطالعه" value={toFaDigits(stats.studyHours)} accent="amber" />
        <StatCard icon="✎" label="تعداد تست‌ها" value={toFaDigits(stats.totalTests)} accent="pink" />
      </section>

      {/* نوار پیشرفت نسبت به هدف هفتگی */}
      {weeklyGoal && weeklyGoal > 0 && (
        <section className="goal-banner">
          <div className="goal-banner-head">
            <span className="goal-banner-title">🎯 هدف هفتگی</span>
            <span className="goal-banner-value">
              {toFaDigits(stats.totalMinutes)} دقیقه از {toFaDigits(weeklyGoal)} دقیقه
            </span>
          </div>
          <div className="progress-track big">
            <div className="progress-fill" style={{ width: `${goalProgress}%` }} />
          </div>
          <div className="goal-banner-foot">
            {goalProgress >= 100
              ? '🎉 آفرین! به هدف هفتگی رسیدی'
              : `بیشتر تلاش کن، ${toFaDigits(Math.max(0, 100 - goalProgress))}٪ تا هدف`}
          </div>
        </section>
      )}

      {/* کارت اطلاعات تماس مشاور */}
      {advisor && (
        <section className="advisor-contact-card">
          <div className="advisor-contact-head">
            <div className="advisor-contact-avatar">{getInitials(advisor.fullName)}</div>
            <div>
              <div className="advisor-contact-name">{advisor.fullName}</div>
              <div className="advisor-contact-sub">مشاور شما</div>
            </div>
          </div>
          <div className="advisor-contact-rows">
            <a href={`mailto:${advisor.email}`} className="advisor-contact-row">
              <span className="contact-icon">📧</span>
              <span dir="ltr">{advisor.email}</span>
            </a>
            {advisor.phone && (
              <a href={`tel:${advisor.phone}`} className="advisor-contact-row phone-row">
                <span className="contact-icon">📞</span>
                <span dir="ltr">{toFaDigits(advisor.phone)}</span>
              </a>
            )}
          </div>
          {advisor.bio && (
            <div className="advisor-contact-bio">
              <div className="bio-label">📝 درباره‌ی مشاور:</div>
              <p className="bio-text">{advisor.bio}</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}