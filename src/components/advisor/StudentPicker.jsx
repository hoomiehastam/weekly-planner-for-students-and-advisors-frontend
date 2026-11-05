import { toFaDigits } from '../../utils/jalali';
import { getInitials } from '../PlanBits';
import Ico from '../Ico';

// فهرست دانش‌آموزان مشاور (صفحه‌ی «دانش‌آموزها»).
// با انتخاب هر دانش‌آموز، بخش‌های دیگر منو (پرونده، یادآور، برنامه، آزمون…) برای او باز می‌شود.
// دانش‌آموزانی که حسابشان غیرفعال شده (isActive === false) در بخش جدای پایین می‌آیند؛
// کلیک‌پذیر نیستند، چون پنلشان بسته است و برنامه/آزمون برایشان معنی ندارد.
// props:
//   students     آرایه‌ی دانش‌آموزها
//   selectedId   شناسه‌ی دانش‌آموز انتخاب‌شده یا undefined
//   loading      در حال بارگذاری؟
//   onSelect(student)
export default function StudentPicker({ students, selectedId, loading, onSelect }) {
  const active = students.filter((s) => s.isActive !== false);
  const inactive = students.filter((s) => s.isActive === false);

  return (
    <section id="section-students" className="card student-picker">
      <h3 className="card-title">
        <span aria-hidden><Ico e="🎒" /></span> دانش‌آموزهای من
        <span className="student-picker-count muted-text">({toFaDigits(active.length)})</span>
      </h3>
      <p className="muted-text">یک دانش‌آموز را انتخاب کن تا پرونده، برنامه و آزمون‌هایش باز شود.</p>
      {loading && <p className="muted-text">در حال بارگذاری…</p>}
      {!loading && active.length === 0 && (
        <p className="muted-text">هنوز دانش‌آموز فعالی به تو متصل نیست.</p>
      )}
      <div className="student-picker-grid">
        {active.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`student-picker-item ${selectedId === s.id ? 'active' : ''}`}
            aria-pressed={selectedId === s.id}
            onClick={() => onSelect(s)}
          >
            <span className="student-picker-avatar" aria-hidden>{getInitials(s.fullName)}</span>
            <span className="student-picker-info">
              <strong>{s.fullName}</strong>
              <small>
                {s.weeklyGoalMinutes
                  ? `هدف: ${toFaDigits(Math.round(s.weeklyGoalMinutes / 60))} ساعت در هفته`
                  : 'بدون هدف هفتگی'}
              </small>
            </span>
            {selectedId === s.id && <i className="ti ti-check student-picker-check" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="student-picker-inactive" data-tour="student-inactive">
          <h4 className="student-picker-inactive-title">
            <Ico e="⏸" /> دانش‌آموزهای غیرفعال <span className="student-picker-count">({toFaDigits(inactive.length)})</span>
          </h4>
          <p className="muted-text">حساب این دانش‌آموزان توسط مدیریت غیرفعال شده؛ تا فعال‌شدن دوباره، قابل انتخاب نیستند.</p>
          <div className="student-picker-grid">
            {inactive.map((s) => (
              <div key={s.id} className="student-picker-item is-inactive" aria-disabled="true">
                <span className="student-picker-avatar" aria-hidden>{getInitials(s.fullName)}</span>
                <span className="student-picker-info">
                  <strong>{s.fullName}</strong>
                  <small>غیرفعال</small>
                </span>
                <span className="student-picker-badge">غیرفعال</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
