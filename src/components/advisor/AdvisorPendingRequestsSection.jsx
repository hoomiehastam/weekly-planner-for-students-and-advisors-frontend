import Ico from '../Ico';
import { formatRelativeTime, toFaDigits } from '../../utils/jalali';

export default function AdvisorPendingRequestsSection({
  pendingRequests,
  handleAcceptRequest,
  handleRejectRequest,
}) {
  if (pendingRequests.length === 0) {
    return (
      <div className="empty-card">
        <span className="empty-emoji" aria-hidden><Ico e="📭" /></span>
        <p>درخواست جدیدی از طرف دانش‌آموزان نداری.</p>
      </div>
    );
  }

  return (
    <section id="section-requests" className="card admin-section" style={{ marginBottom: 'var(--gap-md)' }}>
      <h3 className="card-title">
        <span aria-hidden><Ico e="📨" /></span> درخواست‌های دانش‌آموزان
        <span className="badge-updated" style={{ marginInlineStart: 8 }}>
          {toFaDigits(pendingRequests.length)} جدید
        </span>
      </h3>
      <p className="muted-text" style={{ marginBottom: 12 }}>
        این دانش‌آموزان می‌خواهند به تو متصل شوند. بعد از تأیید، می‌توانی برایشان برنامه و آزمون بسازی.
      </p>
      <div className="institute-advisor-list">
        {pendingRequests.map((req) => (
          <div key={req.id} className="student-request-card">
            <div className="student-request-avatar">
              {req.student.photoUrl ? (
                <img
                  src={req.student.photoUrl}
                  alt=""
                  className="student-request-photo"
                />
              ) : (
                (req.student.fullName || '؟').charAt(0)
              )}
            </div>
            <div className="student-request-body">
              <span className="student-request-name">{req.student.fullName}</span>
              <div className="student-request-meta">
                {req.student.field && (
                  <span>
                    {req.student.field === 'HUMANITIES' ? <><Ico e="📚" /> علوم انسانی</>
                      : req.student.field === 'MATH_PHYSICS' ? <><Ico e="📐" /> ریاضی و فیزیک</>
                      : <><Ico e="🧪" /> علوم تجربی</>}
                  </span>
                )}
                <span><Ico e="🕐" /> {formatRelativeTime(req.createdAt)}</span>
                {req.student.phone && (
                  <a href={`tel:${req.student.phone}`} dir="ltr" onClick={(e) => e.stopPropagation()}>
                    <Ico e="📞" /> {toFaDigits(req.student.phone)}
                  </a>
                )}
              </div>
              <a
                href={`mailto:${req.student.email}`}
                className="student-request-email"
                dir="ltr"
                onClick={(e) => e.stopPropagation()}
              >
                <Ico e="📧" /> {req.student.email}
              </a>
              {req.student.bio && (
                <p className="student-request-bio">{req.student.bio}</p>
              )}
            </div>
            <div className="student-request-actions">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => handleAcceptRequest(req.id, req.student.fullName)}
              >
                <Ico e="✓" /> قبول
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => handleRejectRequest(req.id, req.student.fullName)}
              >
                <Ico e="✕" /> رد
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

