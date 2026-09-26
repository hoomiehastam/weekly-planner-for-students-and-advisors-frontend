import { toFaDigits, formatJalaliDate, formatRelativeTime } from '../../utils/jalali';

// بخش یادآورهای مشاور برای دانش‌آموز.
// props:
//   reminders       آرایه‌ی یادآورها
//   unreadReminders تعداد خوانده‌نشده
//   onDelete(id)    حذف یک یادآور
export default function RemindersSection({ reminders, unreadReminders, onDelete }) {
  return (
    <section className="reminder-section">
      <div className="section-head">
        <h3 className="section-title">
          <span className="section-emoji">🔔</span>
          یادآورهای مشاور
        </h3>
        {unreadReminders > 0 && (
          <span className="badge-new">{toFaDigits(unreadReminders)} جدید</span>
        )}
      </div>

      {reminders.length === 0 ? (
        <div className="empty-card">
          <span className="empty-emoji" aria-hidden>🌤</span>
          <p>فعلاً یادآوری نداری. یه روز خوب داشته باش!</p>
        </div>
      ) : (
        <div className="reminder-list">
          {reminders.map((r) => (
            <div key={r.id} className="reminder-card">
              <div className="reminder-avatar">💬</div>
              <div className="reminder-content">
                <p className="reminder-text">{r.message}</p>
                <span className="reminder-time" title={formatJalaliDate(r.createdAt)}>
                  {formatRelativeTime(r.createdAt)}
                </span>
              </div>
              <button
                className="btn-icon-only"
                title="حذف یادآور"
                onClick={() => onDelete(r.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}