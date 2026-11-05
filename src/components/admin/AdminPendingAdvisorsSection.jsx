import Ico from '../Ico';
import { formatJalaliDate, toFaDigits } from '../../utils/jalali';

export default function AdminPendingAdvisorsSection({
  pending,
  handleApprove,
  handleReject,
}) {
  return (
    <section className="card admin-section">
      <h3 className="card-title">
        <span aria-hidden><Ico e="⏳" /></span> مشاوران در انتظار تأیید ({toFaDigits(pending.length)})
      </h3>

      {pending.length === 0 && (
        <div className="empty-card small">
          <span className="empty-emoji" aria-hidden><Ico e="✅" /></span>
          <p>فعلاً مشاور در انتظاری وجود ندارد.</p>
        </div>
      )}

      <div className="pending-advisor-list">
        {pending.map((advisor) => (
          <div key={advisor.id} className="pending-advisor-card">
            <div className="pending-advisor-head">
              <div className="pending-advisor-avatar">
                {(advisor.fullName || '؟').charAt(0)}
              </div>
              <div className="pending-advisor-info">
                <strong className="pending-advisor-name">{advisor.fullName}</strong>
                <span className="pending-advisor-date">
                  ثبت‌نام در: {formatJalaliDate(advisor.createdAt, { withWeekday: false })}
                </span>
                {advisor.institute && (
                  <span className="muted-text" style={{ fontSize: '11px' }}>
                    <Ico e="🏫" /> {advisor.institute.name}
                  </span>
                )}
              </div>
            </div>

            <div className="pending-advisor-contacts">
              <div className="contact-row">
                <span className="contact-label"><Ico e="📧" /> ایمیل:</span>
                <a href={`mailto:${advisor.email}`} className="contact-value" dir="ltr">
                  {advisor.email}
                </a>
              </div>
              {advisor.phone && (
                <div className="contact-row">
                  <span className="contact-label"><Ico e="📞" /> تماس:</span>
                  <a href={`tel:${advisor.phone}`} className="contact-value" dir="ltr">
                    {toFaDigits(advisor.phone)}
                  </a>
                </div>
              )}
            </div>

            {advisor.bio && (
              <div className="pending-advisor-bio">
                <div className="bio-label"><Ico e="📝" /> توضیحات مشاور:</div>
                <p className="bio-text">{advisor.bio}</p>
              </div>
            )}

            <div className="pending-advisor-actions">
              <button className="btn-primary" onClick={() => handleApprove(advisor.id)} type="button">
                <Ico e="✓" /> تأیید
              </button>
              <button className="btn-secondary" onClick={() => handleReject(advisor.id)} type="button">
                <Ico e="✕" /> رد
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

