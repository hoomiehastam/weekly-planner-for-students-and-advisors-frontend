import { useState } from 'react';
import { DAY_NAMES } from '../../utils/dayNames';
import { toFaDigits } from '../../utils/jalali';
import { TimeBadge, dayTotalMinutes, formatDurationFa } from '../PlanBits';
import { topicLabel } from '../../utils/planItem';
import Ico from '../Ico';

function StatusLabel({ status }) {
  if (status === 'DONE') return <span className="status-pill done">انجام شده</span>;
  if (status === 'SKIPPED') return <span className="status-pill skipped">نادیده</span>;
  return <span className="status-pill pending">در انتظار</span>;
}

export default function AdvisorDayBlock({ day }) {
  const [open, setOpen] = useState(false);
  const itemsDone = day.items.filter((i) => i.status === 'DONE').length;
  // کلیات روز برای حالت بسته: تعداد درس، جمع ساعت، نام چند درس اول
  const totalMin = dayTotalMinutes(day.items);
  const names = day.items.slice(0, 3).map((i) => i.subject).join('، ');

  return (
    <div className={`day-block ${open ? 'is-open' : 'is-collapsed'}`}>
      <button
        type="button"
        className="day-header day-header-toggle"
        onClick={() => setOpen((o) => !o)}
        title={open ? 'جمع‌کردن این روز' : 'بازکردن این روز'}
      >
        <span className="day-header-title">
          <span className="chevron day-chevron">{open ? '▾' : '▸'}</span>
          <h4>{DAY_NAMES[day.dayOfWeek]}</h4>
        </span>
        {!open && day.items.length > 0 && (
          <span className="day-block-summary">
            <span className="day-summary-count">{toFaDigits(day.items.length)} درس</span>
            {totalMin > 0 && <span className="day-summary-time">{formatDurationFa(totalMin)}</span>}
            {names && (
              <span className="day-summary-names">{names}{day.items.length > 3 ? ' …' : ''}</span>
            )}
          </span>
        )}
        {day.items.length > 0 && (
          <span className="day-count">
            {toFaDigits(itemsDone)}/{toFaDigits(day.items.length)}
          </span>
        )}
      </button>

      {open && (
        <div className="day-items-wrap">
          {day.items.length === 0 ? (
            <p className="muted-text">کاری برای این روز ثبت نشده.</p>
          ) : (
            day.items.map((item) => (
              <div className="task-row advisor-task" key={item.id}>
                <div className="task-content">
                  <strong>{item.subject}</strong>
                  {topicLabel(item) && <span className="task-topic">{topicLabel(item)}</span>}
                  {item.description && <span className="task-desc">{item.description}</span>}
                  <div className="task-meta">
                    <TimeBadge startTime={item.startTime} endTime={item.endTime} />
                    <StatusLabel status={item.status} />
                    {item.tags.map((t) => (
                      <span className="tag-pill" key={t.tag.id}>
                        {t.tag.name}
                      </span>
                    ))}
                  </div>

                  {/* نمایش per-tag لاگ‌های دانش‌آموز برای این درس */}
                  {(item.itemLogs || []).length > 0 && (
                    <div className="advisor-pertag-list">
                      <div className="advisor-pertag-label">
                        <Ico e="📝" /> زمانی که دانش‌آموز ثبت کرده:
                      </div>
                      {(item.itemLogs || []).map((log, logIdx) => (
                        <div
                          key={logIdx}
                          className={`advisor-pertag-row ${log.tagId ? '' : 'is-other'}`}
                        >
                          <span className="advisor-pertag-name">
                            {log.tag ? log.tag.name : <><Ico e="📌" /> سایر کارها</>}
                          </span>
                          <span className="advisor-pertag-min">
                            <Ico e="⏱" /> {toFaDigits(log.minutes)} دقیقه
                          </span>
                          {log.testsTaken !== null && log.testsTaken !== undefined && (
                            <span className="advisor-pertag-tests">
                              <Ico e="✎" /> {toFaDigits(log.testsTaken)} تست
                            </span>
                          )}
                          {log.note && (
                            <span className="advisor-pertag-note">
                              — {log.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

