import { useState } from 'react';
import { toFaDigits, formatJalaliShort } from '../../utils/jalali';
import { DAY_NAMES } from '../../utils/dayNames';
import PerTagInputs from '../PerTagInputs';
import { computeProgress, TimeBadge } from '../PlanBits';

// کارت یک برنامه‌ی مطالعاتی در نمای لیست دانش‌آموز (شامل روزها، آیتم‌ها و ورودی per-tag).
// روزها هم مثل خودِ برنامه قابل باز/بسته شدن هستند (نسخه‌ی ۸).
// props:
//   plan         برنامه
//   isOpen       آیا برنامه باز است؟
//   onToggleOpen  باز/بسته‌کردن برنامه
//   onToggleItem(planId, dayId, itemId, currentStatus)  تیک زدن یک آیتم
export default function PlanStudentCard({ plan, isOpen, onToggleOpen, onToggleItem }) {
  const progress = computeProgress(plan);
  // روزهای باز — پیش‌فرض: همه بسته تا صفحه جمع‌وجور بماند
  const [openDayIds, setOpenDayIds] = useState(() => new Set());

  function toggleDay(dayId) {
    setOpenDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  return (
    <div className={`plan-card ${isOpen ? 'is-open' : ''}`}>
      <button className="plan-card-header" onClick={onToggleOpen}>
        <div className="plan-card-title-wrap">
          <h4 className="plan-title">{plan.title}</h4>
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
            {plan.days.map((day) => {
              const dayOpen = openDayIds.has(day.id);
              const itemsDone = day.items.filter((i) => i.status === 'DONE').length;
              return (
                <div className={`day-block ${dayOpen ? 'is-open' : ''}`} key={day.id}>
                  <button
                    type="button"
                    className="day-header day-header-toggle"
                    onClick={() => toggleDay(day.id)}
                    title={dayOpen ? 'جمع‌کردن این روز' : 'بازکردن این روز'}
                  >
                    <span className="day-header-title">
                      <span className="chevron day-chevron">{dayOpen ? '▾' : '▸'}</span>
                      <h4>{DAY_NAMES[day.dayOfWeek]}</h4>
                    </span>
                    {day.items.length > 0 && (
                      <span className="day-count">
                        {toFaDigits(itemsDone)}/{toFaDigits(day.items.length)}
                      </span>
                    )}
                  </button>
                  {dayOpen && (
                    <div className="day-items-wrap">
                      {day.items.length === 0 ? (
                        <p className="muted-text">استراحت یا تکمیل در انتظار مشاور.</p>
                      ) : (
                        day.items.map((item) => (
                          <div
                            key={item.id}
                            className={`task-row ${item.status === 'DONE' ? 'is-done' : ''}`}
                          >
                            <label className="task-checkbox">
                              <input
                                type="checkbox"
                                checked={item.status === 'DONE'}
                                onChange={() => onToggleItem(plan.id, day.id, item.id, item.status)}
                              />
                              <span className="checkmark" aria-hidden>✓</span>
                            </label>
                            <div className="task-content">
                              <strong className={item.status === 'DONE' ? 'done-text' : ''}>
                                {item.subject}
                              </strong>
                              {item.description && <span className="task-desc">{item.description}</span>}
                              <div className="task-meta">
                                <TimeBadge startTime={item.startTime} endTime={item.endTime} />
                                {item.tags.map((t) => (
                                  <span className="tag-pill" key={t.tag.id}>
                                    {t.tag.name}
                                  </span>
                                ))}
                              </div>
                              {/* ورودی‌های per-tag: برای هر تگ اختصاص‌داده‌شده به این درس، دقیقه و تست ثبت می‌شود */}
                              <PerTagInputs item={item} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
