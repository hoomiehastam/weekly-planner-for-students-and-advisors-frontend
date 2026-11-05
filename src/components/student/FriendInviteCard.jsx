import { useEffect, useState } from 'react';
import { fetchMyFriendInvite } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatJalaliDate, toFaDigits } from '../../utils/jalali';
import { fullUrl, copyText, canNativeShare, nativeShare } from '../../utils/shareLink';
import Ico from '../Ico';

const STATUS_LABEL = {
  PENDING: 'در انتظار اولین پرداخت دوستت',
  ACTIVE: 'فعال',
  EXPIRED: 'منقضی‌شده',
};

// کارت «دعوت دوستان و تخفیف» در پنل دانش‌آموز.
// دوستت با لینک تو ثبت‌نام می‌کند و به همان مشاور وصل می‌شود. بعد از اولین پرداخت تأییدشده‌ی او،
// بین ۵ تا ۱۵ درصد (تصادفی) تخفیف شهریه‌ی ماهانه برای هر دو نفر شما، به مدت یک سال.
// مجموع تخفیف هر نفر حداکثر ۱۵ درصد است.
export default function FriendInviteCard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyFriendInvite()
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <section className="card invite-card"><p className="muted-text">در حال بارگذاری…</p></section>;
  if (!data) return null;

  const url = fullUrl(data.path);
  const pct = data.summary?.percent || 0;
  const cap = data.cap || 15;

  async function handleCopy() {
    const ok = await copyText(url);
    if (ok) toast.success('لینک دعوت کپی شد');
    else toast.error('کپی نشد؛ لینک را انتخاب و دستی کپی کن');
  }
  async function handleShare() {
    const ok = await nativeShare({
      title: 'دعوت به دانش‌آموزینو',
      text: `با لینک من ثبت‌نام کن؛ هر دومان تخفیف شهریه می‌گیریم${data.advisorName ? ` و به مشاور «${data.advisorName}» وصل می‌شوی` : ''}:`,
      url,
    });
    if (!ok) handleCopy();
  }

  return (
    <section className="card invite-card friend-invite-card">
      <h3 className="card-title"><span aria-hidden><Ico e="🎁" /></span> دعوت دوستان و تخفیف شهریه</h3>

      <p className="muted-text">
        دوستت را با لینک خودت دعوت کن. بعد از اولین پرداخت او، <strong>هر دوی شما بین {toFaDigits(data.min)} تا {toFaDigits(data.max)} درصد</strong>{' '}
        تخفیف شهریه‌ی ماهانه می‌گیرید (عدد را قرعه‌کشی تعیین می‌کند) و تخفیف {toFaDigits(data.validDays)} روز اعتبار دارد.
        مجموع تخفیف هر نفر حداکثر {toFaDigits(cap)} درصد است.
      </p>

      <div className="discount-meter" data-tour="friend-meter" aria-label={`تخفیف فعلی ${pct} درصد از ${cap}`}>
        <div className="discount-meter-top">
          <span>تخفیف فعال من</span>
          <strong>{toFaDigits(pct)}٪ از {toFaDigits(cap)}٪</strong>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (pct / cap) * 100)}%` }} /></div>
      </div>

      {data.canInvite ? (
        <div className="invite-link-row" data-tour="friend-link">
          <input readOnly dir="ltr" value={url} onFocus={(e) => e.target.select()} aria-label="لینک دعوت دوست" />
          <button type="button" className="btn-primary btn-sm" onClick={handleCopy}><Ico e="📋" /> کپی</button>
          {canNativeShare() && (
            <button type="button" className="btn-secondary btn-sm" onClick={handleShare}><Ico e="📤" /> اشتراک</button>
          )}
        </div>
      ) : (
        <div className="alert alert-info">
          <span><Ico e="ℹ" /></span>{' '}
          {data.reason === 'NO_ADVISOR'
            ? 'لینک دعوت بعد از اتصال به مشاور فعال می‌شود.'
            : 'مشاور یا آموزشگاهت فعلاً طرح تخفیف دعوت را خاموش کرده است.'}
        </div>
      )}

      {data.summary?.items?.length > 0 && (
        <ul className="referral-list">
          {data.summary.items.map((r) => (
            <li key={r.id} className={`referral-item st-${r.status.toLowerCase()}`}>
              <span className="referral-name">
                {r.role === 'INVITER' ? `دعوت‌شده: ${r.otherName}` : `دعوت‌کننده‌ی من: ${r.otherName}`}
              </span>
              <span className="referral-state">
                {STATUS_LABEL[r.status] || r.status}
                {r.status === 'ACTIVE' && r.percent != null && ` · ${toFaDigits(r.percent)}٪ تا ${formatJalaliDate(r.expiresAt, { withYear: true })}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
