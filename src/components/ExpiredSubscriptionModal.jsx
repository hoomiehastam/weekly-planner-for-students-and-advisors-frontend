import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatJalaliDate } from '../utils/jalali';
import Logo from './Logo';
import Ico from './Ico';

// پنجره‌ی «اشتراک شما به پایان رسیده است».
// کاربر وارد حساب می‌شود، ولی پنل کاری (که سرور برای اشتراک تمام‌شده می‌بندد) نشان داده نمی‌شود؛
// به‌جایش این پنجره می‌آید و دکمه‌ی اصلی او را به صفحه‌ی واریز می‌برد.
// بستن با کلیک بیرون ندارد، چون پشت آن چیزی برای استفاده نیست.
export default function ExpiredSubscriptionModal() {
  const { auth, logout, refreshAccess } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // هر بار که پنجره باز می‌شود، وضعیت را تازه کن؛ شاید همین حالا تمدید شده باشد
  // (مثلاً کاربر از صفحه‌ی واریز برگشته و مشاور رسید را تأیید کرده)
  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  // برگشتن به برنامه از جای دیگر (مثلاً برنامه‌ی بانک): دوباره بررسی کن
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) refreshAccess();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshAccess]);

  const personal = auth?.access?.userSubscription || null;
  const institute = auth?.access?.instituteSubscription || null;
  // اگر فقط اشتراک مؤسسه وجود دارد، متن باید همان را بگوید
  const instituteOnly = !!institute && !personal;

  const endsAtList = [personal?.endsAt, institute?.endsAt]
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));
  const endedAt = endsAtList.length ? new Date(Math.max(...endsAtList)) : null;

  async function handleCheckAgain() {
    setChecking(true);
    const result = await refreshAccess();
    setChecking(false);
    if (result === false) toast.info('هنوز تمدید نشده است');
    else if (result === null) toast.error('اتصال به اینترنت برقرار نیست');
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* پس‌زمینه‌ی ساده پشت پنجره */}
      <div className="fullscreen-loading" aria-hidden="true">
        <div className="loading-logo"><Logo size={40} /></div>
      </div>

      <div className="modal-overlay" role="presentation">
        <div
          className="confirm-modal expired-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expired-title"
          aria-describedby="expired-desc"
        >
          <div className="confirm-modal-icon"><Ico e="⌛" /></div>
          <h2 id="expired-title" className="expired-title">اشتراک شما به پایان رسیده است</h2>
          <p id="expired-desc" className="confirm-modal-message">
            {instituteOnly
              ? `اشتراک مؤسسه‌ی ${institute.instituteName || 'شما'} تمام شده است. `
              : 'مدت اشتراک حساب شما تمام شده است. '}
            برای ادامه‌ی کار با پنل، اشتراک را تمدید کن. اطلاعات و برنامه‌هایت پاک نشده‌اند
            و بعد از تمدید دوباره در دسترس‌اند.
          </p>
          {endedAt && (
            <p className="expired-date">پایان اشتراک: {formatJalaliDate(endedAt)}</p>
          )}

          <div className="confirm-modal-actions expired-actions">
            <button
              type="button"
              className="btn-primary expired-primary"
              autoFocus
              onClick={() => navigate('/deposit')}
            >
              <Ico e="💳" /> رفتن به صفحه‌ی واریز
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCheckAgain}
              disabled={checking}
            >
              {checking ? 'در حال بررسی…' : 'تمدید کرده‌ام، بررسی دوباره'}
            </button>
            <button type="button" className="expired-logout" onClick={handleLogout}>
              خروج از حساب
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
