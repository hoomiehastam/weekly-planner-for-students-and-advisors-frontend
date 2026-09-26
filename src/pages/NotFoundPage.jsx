import { Link } from 'react-router-dom';

// صفحه‌ی ۴۰۴ — وقتی کاربر به مسیر نامعتبر می‌رود
export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-emoji">🔍</div>
        <h1>۴۰۴</h1>
        <h2>صفحه‌ای که دنبالشی پیدا نشد</h2>
        <p>شاید آدرس رو اشتباه وارد کرده باشی یا صفحه حذف شده باشه.</p>
        <Link to="/" className="btn-primary">
          🏠 بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
