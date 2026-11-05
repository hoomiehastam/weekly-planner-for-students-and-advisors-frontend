import { useEffect, useState } from 'react';
import Logo from './Logo';

// صفحه‌ی مدرن قطع اتصال اینترنت (۲۰۲۶)
// هنگام عدم دسترسی به سرور یا قطع کامل اینترنت نمایش داده می‌شود.
export default function OfflineScreen({ onRetry, retrying = false }) {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (onRetry) onRetry();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onRetry]);

  return (
    <div className="offline-screen-wrap" role="alert">
      <div className="offline-ambient-glow" />
      <div className="offline-card">
        {/* رادار پالس آفلاین */}
        <div className="offline-radar-wrap">
          <div className="offline-radar-pulse" />
          <div className="offline-icon-circle">
            <i className="ti ti-wifi-off" />
          </div>
        </div>

        <div className="offline-brand-badge">
          <Logo size={20} />
          <span>{online ? 'شبکه متصل است · سرور در دسترس نیست' : 'دانش‌آموزینو · عدم اتصال اینترنت'}</span>
        </div>

        <h1 className="offline-title">اتصال به اینترنت برقرار نیست</h1>
        <p className="offline-desc">
          ارتباط با سرور پلتفرم برقرار نشد. لطفاً اتصال شبکه یا وای‌فای دستگاه خود را بررسی کنید؛ به‌محض اتصال مجدد، سیستم به‌طور خودکار اطلاعات را همگام‌سازی خواهد کرد.
        </p>

        <div className="offline-notice-pill">
          <i className="ti ti-database-check" style={{ fontSize: 16 }} />
          <span>برنامه‌ها و رکوردهای قبلی شما در حافظه دستگاه محفوظ است.</span>
        </div>

        <div className="offline-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onRetry}
            disabled={retrying}
          >
            <i className={`ti ${retrying ? 'ti-loader animate-spin' : 'ti-refresh'}`} />
            <span>{retrying ? 'در حال برقراری ارتباط…' : 'تلاش دوباره'}</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.location.reload()}
          >
            <i className="ti ti-rotate" />
            <span>بارگذاری مجدد</span>
          </button>
        </div>
      </div>
    </div>
  );
}
