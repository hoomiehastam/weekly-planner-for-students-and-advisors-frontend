import { useEffect, useState } from 'react';
import { createParentInvite, fetchMyParentInvite } from '../../api/client';
import { toFaDigits, formatJalaliDate } from '../../utils/jalali';
import Ico from '../Ico';

// کارت «کد دعوت والد» — دانش‌آموز کد می‌سازد و به والدش می‌دهد.
// والد با همان کد در پنل خودش متصل می‌شود؛ کد یک‌بارمصرف و ۷ روزه است.
export default function ParentInviteCard() {
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyParentInvite()
      .then((data) => setInvite(data.invite))
      .catch(() => {});
  }, []);

  async function handleCreate() {
    setBusy(true);
    setError('');
    try {
      const data = await createParentInvite();
      setInvite(data.invite);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // کپی خودکار ممکن نیست — کاربر کد را دستی می‌بیند و می‌تواند انتخاب کند
    }
  }

  return (
    <section className="card parent-invite-card">
      <h3 className="card-title">
        <span aria-hidden><Ico e="👨‍👩‍👦" /></span> پنل والد
      </h3>
      {invite ? (
        <>
          <p className="muted-text">
            این کد را به والدت بده تا در «ثبت‌نام والد» وارد کند و به پیشرفت تو دسترسی پیدا کند.
            کد تا {formatJalaliDate(invite.expiresAt, { withYear: false })} کار می‌کند و فقط یک‌بار قابل استفاده است.
          </p>
          <div className="parent-invite-code-row">
            <strong className="parent-invite-code" dir="ltr">{toFaDigits(invite.code)}</strong>
            <button type="button" className="btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? <><Ico e="✓" /> کپی شد</> : <><Ico e="📋" /> کپی</>}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted-text">
            می‌خواهی والدت پیشرفتت را ببیند؟ یک کد دعوت بساز و به او بده — او با کد ثبت‌نام می‌کند
            و آمار هفتگی و نمرات آزمون‌هایت را در پنل خودش می‌بیند.
          </p>
          <button type="button" className="btn-primary btn-sm" onClick={handleCreate} disabled={busy}>
            {busy ? 'در حال ساخت…' : <><Ico e="🎟" /> ساخت کد دعوت والد</>}
          </button>
        </>
      )}
      {error && <div className="alert alert-error"><span><Ico e="⚠" /></span> {error}</div>}
    </section>
  );
}
