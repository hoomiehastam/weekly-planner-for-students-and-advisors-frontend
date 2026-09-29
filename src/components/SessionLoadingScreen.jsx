import Logo from './Logo';

// لودینگ تمام‌صفحه و وسط‌چین — موقع بررسی اعتبار جلسه (authLoading) نمایش داده می‌شود.
// محتوای لودینگ دقیقاً وسط صفحه می‌نشیند نه بالای آن.
export default function SessionLoadingScreen() {
  return (
    <div className="fullscreen-loading" role="status" aria-live="polite">
      <div className="loading-logo">
        <Logo size={40} />
      </div>
      <p className="loading-title">در حال بررسی جلسه</p>
      <p className="loading-sub">
        یک لحظه صبر کن
        <span className="loading-dot" aria-hidden>.</span>
        <span className="loading-dot" aria-hidden>.</span>
        <span className="loading-dot" aria-hidden>.</span>
      </p>
    </div>
  );
}
