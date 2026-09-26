import { toFaDigits } from '../../utils/jalali';
import { getInitials } from '../PlanBits';

// فهرست دانش‌آموزهای متصل به مشاور (سایدبار).
// props:
//   students     آرایه‌ی دانش‌آموزها
//   selectedId   id دانش‌آموز انتخاب‌شده یا null
//   loading      در حال بارگذاری؟
//   onSelect(student)  انتخاب یک دانش‌آموز
//   id           شناسه‌ی اختیاری عنصر (برای ناوبری موبایل)
export default function StudentListSidebar({ students, selectedId, loading, onSelect, id }) {
  return (
    <aside id={id} className="card student-list">
      <h3 className="list-title">
        <span aria-hidden>🎒</span> دانش‌آموزهای من
      </h3>
      {loading && <p className="muted-text">در حال بارگذاری…</p>}
      {!loading && students.length === 0 && (
        <p className="muted-text">هنوز دانش‌آموزی به تو متصل نشده.</p>
      )}
      {students.map((s) => (
        <button
          key={s.id}
          className={`student-item ${selectedId === s.id ? 'active' : ''}`}
          onClick={() => onSelect(s)}
        >
          <div className="student-avatar">{getInitials(s.fullName)}</div>
          <div className="student-info">
            <strong>{s.fullName}</strong>
            <span className="student-email">
              {s.weeklyGoalMinutes
                ? `هدف: ${toFaDigits(Math.round(s.weeklyGoalMinutes / 60))} ساعت در هفته`
                : 'بدون هدف هفتگی'}
            </span>
          </div>
        </button>
      ))}
    </aside>
  );
}