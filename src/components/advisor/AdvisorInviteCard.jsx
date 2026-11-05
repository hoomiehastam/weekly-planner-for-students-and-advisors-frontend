import { useEffect, useState } from 'react';
import { fetchMyAdvisorInvite, updateMyAdvisorInvite } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { toFaDigits } from '../../utils/jalali';
import { fullUrl, copyText, canNativeShare, nativeShare } from '../../utils/shareLink';
import ConfirmModal from '../ConfirmModal';
import Ico from '../Ico';

// کارت «لینک دعوت دانش‌آموز» در پنل مشاور.
// دانش‌آموزی که با این لینک ثبت‌نام کند مستقیم و بدون تأیید و بدون انتخاب مشاور به همین مشاور وصل می‌شود.
// لینک ثابت و چندبارمصرف است؛ مشاور می‌تواند غیرفعالش کند یا لینک تازه بسازد (لینک قبلی باطل می‌شود).
export default function AdvisorInviteCard() {
  const toast = useToast();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    fetchMyAdvisorInvite()
      .then((d) => setInvite(d.invite))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(payload, okMessage) {
    setBusy(true);
    try {
      const d = await updateMyAdvisorInvite(payload);
      setInvite(d.invite);
      if (okMessage) toast.success(okMessage);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <section className="card invite-card"><p className="muted-text">در حال بارگذاری لینک دعوت…</p></section>;
  }
  if (!invite) return null;

  const url = fullUrl(invite.path);
  const cap = invite.capacity;

  async function handleCopy() {
    const ok = await copyText(url);
    if (ok) toast.success('لینک دعوت کپی شد');
    else toast.error('کپی نشد؛ لینک را انتخاب و دستی کپی کن');
  }

  async function handleShare() {
    const ok = await nativeShare({
      title: 'لینک دعوت مشاور',
      text: 'با این لینک ثبت‌نام کن تا مستقیم به مشاورت وصل شوی:',
      url,
    });
    if (!ok) handleCopy();
  }

  return (
    <section className="card invite-card" data-tour="invite-card">
      <h3 className="card-title">
        <span aria-hidden><Ico e="🔗" /></span> لینک دعوت دانش‌آموز
      </h3>
      <p className="muted-text">
        این لینک را برای دانش‌آموزت بفرست. با کلیک روی آن ثبت‌نام می‌کند و{' '}
        <strong>بدون نیاز به تأیید تو و بدون انتخاب مشاور</strong> مستقیم به تو وصل می‌شود.
      </p>

      <div className={`invite-link-row ${invite.enabled ? '' : 'is-off'}`}>
        <input readOnly dir="ltr" value={url} onFocus={(e) => e.target.select()} aria-label="لینک دعوت" />
        <button type="button" className="btn-primary btn-sm" onClick={handleCopy} disabled={!invite.enabled}>
          <Ico e="📋" /> کپی
        </button>
        {canNativeShare() && (
          <button type="button" className="btn-secondary btn-sm" onClick={handleShare} disabled={!invite.enabled}>
            <Ico e="📤" /> اشتراک
          </button>
        )}
      </div>

      <div className="invite-meta">
        <span><Ico e="👥" /> {toFaDigits(invite.signedUpCount)} دانش‌آموز با این لینک ثبت‌نام کرده</span>
        {cap.max != null && (
          <span className={cap.full ? 'is-warn' : ''}>
            <Ico e={cap.full ? '⛔' : '📊'} /> ظرفیت: {toFaDigits(cap.count)} از {toFaDigits(cap.max)}
            {cap.scope === 'INSTITUTE' ? ' (سقف آموزشگاه)' : ''}
            {cap.full ? ' — تکمیل است؛ ثبت‌نام جدید با لینک پذیرفته نمی‌شود' : ''}
          </span>
        )}
      </div>

      <div className="invite-toggles">
        <label className="switch-row">
          <input
            type="checkbox"
            checked={invite.enabled}
            disabled={busy}
            onChange={(e) => update({ enabled: e.target.checked }, e.target.checked ? 'لینک دعوت فعال شد' : 'لینک دعوت غیرفعال شد')}
          />
          <span>لینک فعال باشد</span>
        </label>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={invite.referralEnabled && !invite.referralLockedByInstitute}
            disabled={busy || invite.referralLockedByInstitute}
            onChange={(e) => update({ referralEnabled: e.target.checked }, e.target.checked ? 'تخفیف دعوت دوستان روشن شد' : 'تخفیف دعوت دوستان خاموش شد')}
          />
          <span>
            تخفیف دعوت دوستانِ دانش‌آموزهایم روشن باشد
            <small>
              {invite.referralLockedByInstitute
                ? 'آموزشگاه این طرح را خاموش کرده است.'
                : 'اگر روشن باشد، دعوت دوست بین ۵ تا ۱۵ درصد از شهریه‌ی ماهانه‌ی هر دو دانش‌آموز را برای یک سال کم می‌کند؛ این مبلغ از شهریه‌ای است که به کارت تو واریز می‌شود.'}
            </small>
          </span>
        </label>
      </div>

      <button
        type="button"
        className="btn-ghost btn-sm"
        disabled={busy}
        onClick={() => setConfirm({
          message: 'لینک تازه ساخته شود؟ لینک فعلی فوراً باطل می‌شود و هر جا فرستاده‌ای دیگر کار نمی‌کند.',
          confirmText: 'ساخت لینک تازه',
          onConfirm: () => { setConfirm(null); update({ regenerate: true }, 'لینک تازه ساخته شد'); },
        })}
      >
        <Ico e="🔄" /> ساخت لینک تازه
      </button>

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmText={confirm.confirmText}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
