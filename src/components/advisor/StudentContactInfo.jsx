import { toFaDigits } from '../../utils/jalali';

// کارت «اطلاعات دانش‌آموز» در داشبورد مشاور.
// props:
//   student  اطلاعات دانش‌آموز انتخاب‌شده
export default function StudentContactInfo({ student }) {
  return (
    <section className="card student-contact-card">
      <h3 className="card-title">
        <span aria-hidden>👤</span> اطلاعات دانش‌آموز
      </h3>
      <div className="student-contact-grid">
        <div className="contact-item">
          <span className="contact-item-label">نام:</span>
          <span className="contact-item-value">{student.fullName}</span>
        </div>
        <div className="contact-item">
          <span className="contact-item-label">📧 ایمیل:</span>
          <a href={`mailto:${student.email}`} className="contact-item-value" dir="ltr">
            {student.email}
          </a>
        </div>
        {student.phone && (
          <div className="contact-item">
            <span className="contact-item-label">📞 تماس:</span>
            <a href={`tel:${student.phone}`} className="contact-item-value phone-link" dir="ltr">
              {toFaDigits(student.phone)}
            </a>
          </div>
        )}
      </div>
      {student.bio && (
        <div className="student-bio">
          <div className="bio-label">📝 توضیحات دانش‌آموز:</div>
          <p className="bio-text">{student.bio}</p>
        </div>
      )}
    </section>
  );
}