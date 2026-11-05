import { formatJalaliDate, toFaDigits } from '../../utils/jalali';
import { formatAmount, statusBadge } from './depositUtils';

export default function MyDepositsHistory({ deposits }) {
  if (!deposits || deposits.length === 0) return null;

  return (
    <section className="deposit-panel">
      <h2>رسیدهای من</h2>
      <div className="deposit-list">
        {deposits.map((d) => {
          const badge = statusBadge(d.status);
          return (
            <div key={d.id} className={`deposit-item status-${d.status.toLowerCase()}`}>
              <img src={d.receiptImageUrl} alt="رسید" className="deposit-thumb" />
              <div className="deposit-info">
                <div className="muted-text">مقصد: {d.targetTitle}</div>
                {d.amount != null && <div className="muted-text">مبلغ: {formatAmount(d.amount)}</div>}
                <div className="muted-text">{formatJalaliDate(d.createdAt, { withYear: true })}</div>
                <span className={`status-pill ${badge.cls}`}>{badge.text}</span>
                {d.status === 'APPROVED' && d.approvedDays && (
                  <span className="muted-text"> تمدید {toFaDigits(d.approvedDays)} روزه تا {formatJalaliDate(d.newEndsAt, { withYear: true })}</span>
                )}
                {d.status === 'REJECTED' && d.decisionNote && <div className="muted-text">دلیل رد: {d.decisionNote}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

