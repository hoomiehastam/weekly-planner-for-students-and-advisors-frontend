import { formatJalaliDate, toFaDigits } from '../../utils/jalali';
import { formatAmount, statusBadge } from './depositUtils';

export default function IncomingDepositsList({
  incoming,
  onOpenApprove,
  onReject,
}) {
  if (incoming.length === 0) {
    return (
      <section className="deposit-panel">
        <h2>رسیدهای دریافتی</h2>
        <p className="muted-text">فعلاً رسیدی برای تأیید نیامده است.</p>
      </section>
    );
  }

  const pendingCount = incoming.filter((d) => d.status === 'PENDING').length;

  return (
    <section className="deposit-panel">
      <h2>رسیدهای در انتظار تأیید شما ({toFaDigits(pendingCount)})</h2>
      <div className="deposit-list">
        {incoming.map((d) => {
          const badge = statusBadge(d.status);
          return (
            <div key={d.id} className={`deposit-item status-${d.status.toLowerCase()}`}>
              <img src={d.receiptImageUrl} alt={`رسید ${d.payerName || ''}`} className="deposit-thumb" />
              <div className="deposit-info">
                <div className="deposit-payer">{d.payerName} <span className="muted-text">→ {d.targetTitle}</span></div>
                {d.amount != null && <div className="muted-text">مبلغ: {formatAmount(d.amount)}</div>}
                {d.note && <div className="muted-text">{d.note}</div>}
                <div className="muted-text">{formatJalaliDate(d.createdAt, { withYear: true })}</div>
                <span className={`status-pill ${badge.cls}`}>{badge.text}</span>
                {d.status === 'APPROVED' && d.approvedDays && (
                  <span className="muted-text"> +{toFaDigits(d.approvedDays)} روز → {formatJalaliDate(d.newEndsAt, { withYear: true })}</span>
                )}
                {d.status === 'REJECTED' && d.decisionNote && <div className="muted-text">دلیل: {d.decisionNote}</div>}
              </div>
              {d.status === 'PENDING' && (
                <div className="deposit-actions">
                  <button className="btn-primary" onClick={() => onOpenApprove(d)}>تأیید و تمدید</button>
                  <button className="btn-danger" onClick={() => onReject(d)}>رد</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

