import { useState } from 'react';
import { toFaDigits, formatJalaliShort } from '../../utils/jalali';
import { DAY_NAMES } from '../../utils/dayNames';
import PerTagInputs from '../PerTagInputs';
import { computeProgress, TimeBadge } from '../PlanBits';
import { downloadPlanPdf } from '../../utils/planPdf';
import { topicLabel } from '../../utils/planItem';
import Ico from '../Ico';
import DayProgress from './DayProgress';

// کارت یک برنامه‌ی مطالعاتی در نمای لیست دانش‌آموز (شامل روزها، آیتم‌ها و ورودی per-tag).
// روزها هم مثل خودِ برنامه قابل باز/بسته شدن هستند (نسخه‌ی ۸).
// props:
//   plan         برنامه
//   isOpen       آیا برنامه باز است؟
//   onToggleOpen  باز/بسته‌کردن برنامه
//   onToggleItem(planId, dayId, itemId, currentStatus)  تیک زدن یک آیتم
//   studentName  نام دانش‌آموز برای سرصفحه‌ی PDF (اختیاری)
//   advisorName  نام مشاور برای سرصفحه‌ی PDF (اختیاری)
//   isUpdated    مشاور بعد از آخرین بازدید این برنامه را تغییر داده
//   progressRows / onProgressChange  پیشروی دروس (بخش «تا کجا رسیدی؟» آخر هر روز)
export default function PlanStudentCard({ plan, isOpen, onToggleOpen, onToggleItem, studentName, advisorName, isUpdated = false, progressRows = [], onProgressChange }) {
  const progress = computeProgress(plan);
  // روزهای باز — پیش‌فرض: همه بسته تا صفحه جمع‌وجور بماند
  // روز انتخاب‌شده: امروز (شنبه=۰)، وگرنه اولین روزی که کار انجام‌نشده دارد
  const todayIdx = (new Date().getDay() + 1) % 7;
  const [pickedDayId, setPickedDayId] = useState(null);
  const defaultDay =
    plan.days.find((d) => d.dayOfWeek === todayIdx) ||
    plan.days.find((d) => d.items.some((i) => i.status !== 'DONE')) ||
    plan.days[0];
  const activeDay = plan.days.find((d) => d.id === pickedDayId) || defaultDay;

  return (
    <div className={`plan-card ${isOpen ? 'is-open' : ''}`}>
      <div className="plan-card-header">
        <button className="plan-card-toggle" onClick={onToggleOpen}>
          <div className="plan-card-title-wrap">
            <h4 className="plan-title">
              {plan.title}
              {isUpdated && <span className="badge-updated plan-updated-chip">به‌روز شد</span>}
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
            <span className="chevron"><i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true" /></span>
          </div>
        </button>
        <button
          type="button"
          className="plan-pdf-btn"
          title="دانلود برنامه به‌صورت PDF"
          aria-label="دانلود PDF برنامه"
          onClick={() => downloadPlanPdf(plan, { studentName, advisorName })}
        >
          <i className="ti ti-download" aria-hidden="true" /> PDF
        </button>
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

          <div className="day-tabs" role="tablist" aria-label="روزهای هفته">
            {plan.days.map((day) => {
              const itemsDone = day.items.filter((i) => i.status === 'DONE').length;
              const complete = day.items.length > 0 && itemsDone === day.items.length;
              const isActive = activeDay?.id === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`day-tab ${isActive ? 'active' : ''} ${complete ? 'complete' : ''} ${day.dayOfWeek === todayIdx ? 'today' : ''}`}
                  onClick={() => setPickedDayId(day.id)}
                >
                  <span className="day-tab-name">{DAY_NAMES[day.dayOfWeek]}</span>
                  {day.items.length > 0 && (
                    <span className="day-tab-count">
                      {complete ? <i className="ti ti-check" aria-hidden="true" /> : `${toFaDigits(itemsDone)}/${toFaDigits(day.items.length)}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeDay && (
            <div className="day-items-wrap" role="tabpanel">
              {activeDay.items.length === 0 ? (
                <p className="muted-text">استراحت یا تکمیل در انتظار مشاور.</p>
              ) : (
                activeDay.items.map((item) => (
                  <div key={item.id} className={`task-row ${item.status === 'DONE' ? 'is-done' : ''}`} data-tour="plan-item">
                    <label className="task-checkbox">
                      <input
                        type="checkbox"
                        checked={item.status === 'DONE'}
                        onChange={() => onToggleItem(plan.id, activeDay.id, item.id, item.status)}
                      />
                      <span className="checkmark" aria-hidden><Ico e="✓" /></span>
                    </label>
                    <div className="task-content">
                      <strong className={item.status === 'DONE' ? 'done-text' : ''}>{item.subject}</strong>
                      {topicLabel(item) && <span className="task-topic">{topicLabel(item)}</span>}
                      {item.description && <span className="task-desc">{item.description}</span>}
                      <div className="task-meta">
                        <TimeBadge startTime={item.startTime} endTime={item.endTime} />
                        {item.tags.map((t) => (
                          <span className="tag-pill" key={t.tag.id}>{t.tag.name}</span>
                        ))}
                      </div>
                      <div data-tour="plan-log"><PerTagInputs item={item} /></div>
                    </div>
                  </div>
                ))
              )}
              {/* آخر هر روز: تا کجا رسیدی؟ */}
              {activeDay.items.length > 0 && onProgressChange && (
                <DayProgress
                  key={activeDay.id}
                  plan={plan}
                  day={activeDay}
                  rows={progressRows}
                  onRowsChange={onProgressChange}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
