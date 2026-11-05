import { formatJalaliDate } from '../../utils/jalali';
import Ico from '../Ico';
import { STATUS_LABELS } from './depositUtils';

export function SubscriptionChip({ sub, label }) {
  if (!sub) return null;
  // مقایسه‌ی زنده‌ی تاریخ با «الان» عمداً در رندر انجام می‌شود تا انقضا بلافاصله دیده شود
   
  const expired = sub.status === 'EXPIRED' || new Date(sub.endsAt).getTime() < Date.now();
  return (
    <div className={`subscription-chip ${expired ? 'expired' : 'ok'}`}>
      <span className="chip-label">{label}:</span>
      <span>{STATUS_LABELS[sub.status] || sub.status}</span>
      <span className="chip-date">تا {formatJalaliDate(sub.endsAt, { withYear: true })}</span>
    </div>
  );
}

export default function SubscriptionStatusSection({ subscription }) {
  const access = subscription?.access;

  return (
    <section className="deposit-panel deposit-status">
      <h2>وضعیت اشتراک من</h2>
      {access && !access.hasAccess && (
        <div className="expired-banner">
          <Ico e="⛔" /> اشتراک شما منقضی شده است. برای بازگشایی دسترسی، واریز کنید تا رسید شما تأیید شود.
        </div>
      )}
      {subscription?.subscription && (
        <SubscriptionChip sub={subscription.subscription} label="اشتراک فردی" />
      )}
      {subscription?.instituteSubscription && (
        <SubscriptionChip
          sub={subscription.instituteSubscription}
          label={`اشتراک مؤسسه (${subscription.instituteSubscription.instituteName || ''})`}
        />
      )}
      {!subscription?.subscription && !subscription?.instituteSubscription && (
        <p className="muted-text">رکورد اشتراکی ثبت نشده است.</p>
      )}
    </section>
  );
}

