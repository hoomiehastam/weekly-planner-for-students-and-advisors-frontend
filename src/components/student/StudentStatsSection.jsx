import { toFaDigits, formatJalaliDateTime } from '../../utils/jalali';
import { getInitials } from '../PlanBits';
import StatCard from '../StatCard';
import Ico from '../Ico';

// بخش کارت‌های آمار، نوار پیشرفت هدف هفتگی، و کارت تماس مشاور.
// همه‌ی داده‌ها از والد می‌آید؛ هیچ state/تعاملِ پیچیده‌ای اینجا نیست.
// props:
//   stats       { activePlans, doneToday, studyHours, totalTests, totalMinutes }
//   weeklyGoal  minutes یا null
//   goalProgress  درصد ۰ تا ۱۰۰
//   advisor     اطلاعات مشاور یا null
export default function StudentStatsSection({ stats, weeklyGoal, goalProgress, advisor, planTotals, nextExam }) {
  return (
    <>
      {/* کارت‌های آمار */}
      <section className="stats-grid">
        <div className="stat-card stat-ring-card">
          <div className="stat-ring" style={{ '--p': `${planTotals?.pct ?? 0}%` }}>
            <span>{toFaDigits(planTotals?.pct ?? 0)}٪</span>
          </div>
          <div className="stat-body">
            <div className="stat-label">پیشرفت برنامه‌ها</div>
            <div className="stat-value stat-value-sm">
              {planTotals?.total ? `${toFaDigits(planTotals.done)} از ${toFaDigits(planTotals.total)} آیتم` : 'هنوز آیتمی نیست'}
            </div>
          </div>
        </div>
        <StatCard icon="⏱" label="ساعت مطالعه" value={toFaDigits(stats.studyHours)} accent="amber" />
        <StatCard icon="✎" label="تعداد تست‌ها" value={toFaDigits(stats.totalTests)} accent="pink" />
        <StatCard
          icon="🗓"
          label="آزمون بعدی"
          value={nextExam ? <span className="stat-value-sm">{formatJalaliDateTime(nextExam.scheduledAt)}</span> : '—'}
          accent="indigo"
        />
      </section>

      {/* نوار پیشرفت نسبت به هدف هفتگی */}
      {weeklyGoal && weeklyGoal > 0 && (
        <section className="goal-banner">
          <div className="goal-banner-head">
            <span className="goal-banner-title"><Ico e="🎯" /> هدف هفتگی</span>
            <span className="goal-banner-value">
              {toFaDigits(stats.totalMinutes)} دقیقه از {toFaDigits(weeklyGoal)} دقیقه
            </span>
          </div>
          <div className="progress-track big">
            <div className="progress-fill" style={{ width: `${goalProgress}%` }} />
          </div>
          <div className="goal-banner-foot">
            {goalProgress >= 100
              ? <><Ico e="🎉" /> آفرین! به هدف هفتگی رسیدی</>
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
              <span className="contact-icon"><Ico e="📧" /></span>
              <span dir="ltr">{advisor.email}</span>
            </a>
            {advisor.phone && (
              <a href={`tel:${advisor.phone}`} className="advisor-contact-row phone-row">
                <span className="contact-icon"><Ico e="📞" /></span>
                <span dir="ltr">{toFaDigits(advisor.phone)}</span>
              </a>
            )}
          </div>
          {advisor.bio && (
            <div className="advisor-contact-bio">
              <div className="bio-label"><Ico e="📝" /> درباره‌ی مشاور:</div>
              <p className="bio-text">{advisor.bio}</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}