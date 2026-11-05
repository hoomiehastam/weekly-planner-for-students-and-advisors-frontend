function toFaDigits(n) {
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

function formatDuration(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${toFaDigits(h)} ساعت و ${toFaDigits(m)} دقیقه`;
  if (h) return `${toFaDigits(h)} ساعت`;
  return `${toFaDigits(m)} دقیقه`;
}

export default function LessonSummaryTable({ lessonSummary, totalSlots }) {
  return (
    <section className="lesson-summary" aria-label="خلاصه‌ی بازه‌های هر درس">
      <h4 className="lesson-summary-title">
        <i className="ti ti-list-numbers" aria-hidden="true" /> خلاصه‌ی بازه‌های هر درس
      </h4>
      {lessonSummary.length === 0 ? (
        <p className="muted-text">هنوز درسی وارد نشده. با اضافه‌کردن بازه‌ها، تعداد بازه‌ی هر درس اینجا دیده می‌شود.</p>
      ) : (
        <>
          <div className="lesson-summary-table" role="table">
            <div className="lesson-summary-row is-head" role="row">
              <span role="columnheader">درس</span>
              <span role="columnheader">تعداد بازه</span>
              <span role="columnheader">جمع زمان</span>
              <span role="columnheader" className="ls-days-col">روزها</span>
            </div>
            {lessonSummary.map((l) => (
              <div className="lesson-summary-row" role="row" key={l.key}>
                <span role="cell" className="ls-name">
                  <strong>{l.name}</strong>
                  {l.topics.length > 0 && (
                    <small>{l.topics.slice(0, 3).join('، ')}{l.topics.length > 3 ? ' …' : ''}</small>
                  )}
                </span>
                <span role="cell" className="ls-count">{toFaDigits(l.count)} بازه</span>
                <span role="cell" className="ls-time">{l.minutes > 0 ? formatDuration(l.minutes) : '—'}</span>
                <span role="cell" className="ls-days-col">{l.dayNames.join('، ')}</span>
              </div>
            ))}
          </div>
          <p className="lesson-summary-total">
            جمع: {toFaDigits(lessonSummary.length)} درس، {toFaDigits(totalSlots)} بازه در کل برنامه
          </p>
        </>
      )}
    </section>
  );
}

