import Logo from './Logo';

// لودینگ تمام‌صفحه و متوازن ۲۰۲۶ — موقع بررسی اعتبار جلسه (authLoading)
export default function SessionLoadingScreen() {
  return (
    <div className="session-loading-wrap" role="status" aria-live="polite">
      <div className="session-loading-card">
        <div className="session-logo-pulse">
          <Logo size={46} />
        </div>
        <h2 className="session-loading-title">دانش‌آموزینو</h2>
        <div className="session-loading-bar-wrap">
          <div className="session-loading-bar" />
        </div>
        <p className="session-loading-sub">در حال بررسی جلسه و بارگذاری اطلاعات…</p>
      </div>
    </div>
  );
}
