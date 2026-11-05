import SectionGuide from '../SectionGuide';
import Reports from '../Reports';
import FreeStudyCard from '../student/FreeStudyCard';
import NotesReminder from './NotesReminder';
import ProgressOverview from './ProgressOverview';
import PlanBuilder from '../PlanBuilder';
import AdvisorDayBlock from './AdvisorDayBlock';
import { computeProgress } from '../PlanBits';
import { formatJalaliShort, toFaDigits } from '../../utils/jalali';
import Ico from '../Ico';

export default function AdvisorPlansSection({
  userId,
  selectedStudent,
  plans,
  entries,
  progressRows,
  view,
  setView,
  builderState,
  setBuilderState,
  openPlanId,
  setOpenPlanId,
  handlePlanSaved,
  handlePublishDraft,
  handleDeletePlan,
}) {
  return (
    <section id="section-plans">
      <SectionGuide
        userId={userId}
        guideKey="advisor-plans"
        icon="🗓"
        title="برنامه‌ها — برنامه‌ی مطالعه را بساز"
        items={[
          'دکمه‌ی «ساخت برنامه‌ی جدید» را بزن، روزها و درس‌ها را بچین.',
          'برای هر درس برچسب بگذار (پیشروی، تمرین، مرور و...) و تاریخ شروع/انقضا را تعیین کن.',
          'تغییرات بدون کار دستی برای دانش‌آموز اعمال می‌شود.',
        ]}
        tone="sage"
      />
      <div className="section-head with-tabs">
        <h3 className="section-title">
          <span className="section-emoji"><Ico e="🗓" /></span>
          برنامه‌های {selectedStudent.fullName}
        </h3>
        {!builderState && (
          <button className="btn-primary" data-tour="plans-new" onClick={() => setBuilderState('create')} type="button">
            <span aria-hidden>+</span> ساخت برنامه‌ی جدید
          </button>
        )}
      </div>

      {plans.some((p) => p.isDraft) && !builderState && (
        <div className="draft-banner">
          <Ico e="📝" /> {toFaDigits(plans.filter((p) => p.isDraft).length)} پیش‌نویس داری. پیش‌نویس‌ها را ویرایش کن و «انتشار» بزن؛
          تا آن موقع دانش‌آموز آن‌ها را نمی‌بیند.
        </div>
      )}

      {/* تب‌های نمایش برنامه‌ها */}
      {(plans.length > 0 || entries.length > 0) && !builderState && (
        <div className="view-tabs">
          <button
            type="button"
            className={`tab-btn-sm ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            <Ico e="📋" /> لیست
          </button>
          <button
            type="button"
            className={`tab-btn-sm ${view === 'reports' ? 'active' : ''}`}
            onClick={() => setView('reports')}
          >
            <Ico e="📊" /> آمار
          </button>
          <button
            type="button"
            className={`tab-btn-sm ${view === 'free' ? 'active' : ''}`}
            onClick={() => setView('free')}
          >
            <Ico e="📚" /> مطالعه‌ی آزاد{entries.length > 0 ? ` (${toFaDigits(entries.length)})` : ''}
          </button>
        </div>
      )}

      {builderState && (
        <div className="builder-wrap">
          <NotesReminder studentId={selectedStudent.id} studentName={selectedStudent.fullName} />
          {progressRows.length > 0 && <ProgressOverview rows={progressRows} compact />}
          <PlanBuilder
            studentId={selectedStudent.id}
            existingPlan={builderState === 'create' ? null : builderState.plan}
            onSaved={handlePlanSaved}
            onCancel={() => setBuilderState(null)}
          />
        </div>
      )}

      {plans.length === 0 && !builderState && view !== 'free' && (
        <div className="empty-card">
          <span className="empty-emoji" aria-hidden><Ico e="📋" /></span>
          <p>هنوز برنامه‌ای برای این دانش‌آموز نساخته‌ای.</p>
        </div>
      )}

      {plans.length > 0 && !builderState && view === 'list' && (
        <div className="plans-list">
          {plans.map((plan) => {
            const progress = computeProgress(plan);
            const isOpen = openPlanId === plan.id;
            return (
              <div key={plan.id} className={`plan-card ${isOpen ? 'is-open' : ''}`}>
                <div className="plan-card-header">
                  <button
                    type="button"
                    className="plan-card-toggle"
                    onClick={() => setOpenPlanId(isOpen ? null : plan.id)}
                  >
                    <div className="plan-card-title-wrap">
                      <h4 className="plan-title">
                        {plan.title}
                        {plan.isDraft && <span className="draft-pill">پیش‌نویس</span>}
                      </h4>
                      {plan.note && <p className="plan-note">{plan.note}</p>}
                      <p className="plan-dates">
                        <span className="date-chip">از {formatJalaliShort(plan.startsAt)}</span>
                        {plan.expiresAt && (
                          <span className="date-chip">تا {formatJalaliShort(plan.expiresAt)}</span>
                        )}
                      </p>
                    </div>
                    <div className="plan-progress-mini">
                      <div className="ring-progress" style={{ '--p': `${progress}%` }}>
                        <span>{toFaDigits(progress)}٪</span>
                      </div>
                      <span className="chevron">{isOpen ? '▾' : '▸'}</span>
                    </div>
                  </button>
                  <div className="plan-actions">
                    {plan.isDraft && (
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        title="انتشار برای دانش‌آموز"
                        onClick={() => handlePublishDraft(plan.id)}
                        disabled={!!builderState}
                      >
                        انتشار
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-icon edit"
                      title="ویرایش"
                      onClick={() => setBuilderState({ plan })}
                      disabled={!!builderState}
                    >
                      <Ico e="✎" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      title="حذف"
                      onClick={() => handleDeletePlan(plan.id)}
                      disabled={!!builderState}
                    >
                      <Ico e="🗑" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="plan-body">
                    <div className="progress-block">
                      <div className="progress-labels">
                        <span className="muted-text">پیشرفت کلی</span>
                        <span className="muted-text">{toFaDigits(progress)}٪</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="days-stack">
                      {plan.days.map((day) => (
                        <AdvisorDayBlock key={day.id} day={day} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {plans.length > 0 && !builderState && view === 'reports' && (
        <Reports plans={plans.filter((p) => !p.isDraft)} weeklyGoalMinutes={selectedStudent.weeklyGoalMinutes} entries={entries} />
      )}

      {!builderState && view === 'free' && (
        <FreeStudyCard entries={entries} />
      )}
    </section>
  );
}

