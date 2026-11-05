import { useMemo } from 'react';
import { formatJalaliShort } from '../../utils/jalali';
import { keyToDate, latestProgressBySubject } from '../../utils/studyData';
import Ico from '../Ico';

// آخرین پیشرویِ هر درس که دانش‌آموز ثبت کرده («تا کجا رسیده») — برای ادامه‌ی برنامه‌ریزی.
// compact: نسخه‌ی کوچک‌تر برای بالای فرمِ ساخت برنامه
export default function ProgressOverview({ rows, compact = false }) {
  const latest = useMemo(() => latestProgressBySubject(rows || []), [rows]);
  const history = useMemo(() => (rows || []).slice(0, 12), [rows]);

  return (
    <section className={compact ? 'progress-overview is-compact' : 'card progress-overview'} data-tour="ov-progress">
      <h3 className={compact ? 'progress-overview-title' : 'card-title'}>
        <span aria-hidden><Ico e="🧭" /></span> پیشروی دروس (تا کجا رسیده)
      </h3>
      {latest.length === 0 ? (
        <p className="muted-text">دانش‌آموز هنوز پیشرویِ درسی ثبت نکرده است.</p>
      ) : (
        <ul className="progress-list">
          {latest.map((l) => (
            <li key={l.key}>
              <strong>{l.subject}</strong>
              <span className="progress-pos">{l.position}</span>
              <small className="muted-text">{formatJalaliShort(keyToDate(l.studyDay))}</small>
            </li>
          ))}
        </ul>
      )}
      {!compact && history.length > 0 && (
        <details className="progress-history">
          <summary>تاریخچه‌ی اخیر</summary>
          <ul className="progress-list">
            {history.map((r) => (
              <li key={r.id || `${r.studyDay}-${r.subject}`}>
                <small className="muted-text">{formatJalaliShort(keyToDate(r.studyDay))}</small>
                <strong>{r.subject}</strong>
                <span className="progress-pos">{r.position}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
