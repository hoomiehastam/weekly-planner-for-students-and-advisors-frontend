import { Link } from 'react-router-dom';

// صفحه‌ی ۴۰۴ مدرن ۲۰۲۶
export default function NotFoundPage() {
  return (
    <div className="error-screen-wrap">
      <div className="error-ambient-glow" />
      <div className="error-card">
        <div className="error-badge-404">
          <span>۴۰۴</span>
        </div>
        <h1 className="error-card-title">صفحه مورد نظر پیدا نشد</h1>
        <p className="error-card-desc">
          نشانی وارد شده نامعتبر است یا این صفحه حذف یا به آدرس دیگری منتقل شده است.
        </p>
        <div className="error-actions">
          <Link to="/" className="btn-primary">
            <i className="ti ti-home" />
            <span>بازگشت به صفحه اصلی</span>
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.history.back()}
          >
            <i className="ti ti-arrow-right" />
            <span>صفحه قبل</span>
          </button>
        </div>
      </div>
    </div>
  );
}
