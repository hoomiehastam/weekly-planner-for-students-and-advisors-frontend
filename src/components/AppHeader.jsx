import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { getInitials } from './PlanBits';
import { formatJalaliDate } from '../utils/jalali';
import { useAuth } from '../context/AuthContext';
import { brandForRole } from '../utils/brand';

// هدر مشترک داشبوردها. برند بخش (دانش‌آموزینو/مشاور دانش‌آموزینو) + اطلاعات کاربر + پروفایل و خروج.
// props:
//   fullName     نام کامل کاربر
//   greeting     متن تبریک (مثل «سلام، علی!»)
//   avatarClass  کلاس اضافی برای آواتار (مثل advisor-avatar)
//   onOpenProfile  بازکردن مودال پروفایل
//   onLogout       خروج از حساب
export default function AppHeader({ fullName, greeting, avatarClass = '', onOpenProfile, onLogout }) {
  const { auth } = useAuth();
  const brand = brandForRole(auth?.user?.role);
  const photoUrl = auth?.user?.photoUrl;
  const navigate = useNavigate();
  // سوپرادمین اشتراک/پرداخت ندارد — دکمه‌ی واریز برای او نشان داده نمی‌شود
  const isSuperadmin = auth?.user?.role === 'SUPERADMIN';

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <button
            className={`user-avatar avatar-button ${avatarClass}`}
            onClick={onOpenProfile}
            title="ویرایش پروفایل"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="avatar-photo" />
            ) : (
              getInitials(fullName)
            )}
          </button>
          <div>
            <div className="greeting">{greeting}</div>
            <div className="header-date">{formatJalaliDate(new Date(), { withYear: false })}</div>
          </div>
          <span className={`header-brand-chip ${avatarClass ? 'advisor' : 'student'}`} title={brand.tagline}>
            {brand.name}
          </span>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          {/* صفحه‌ی واریز/تمدید اشتراک — برای همه‌ی نقش‌ها جز سوپرادمین؛
              کاربر با اشتراک منقضی هم از همین‌جا تمدید می‌کند */}
          {!isSuperadmin && (
            <button className="btn-ghost header-action" onClick={() => navigate('/deposit')} title="واریز و تمدید اشتراک">
              <span aria-hidden>💳</span>
              <span className="btn-label">واریز</span>
            </button>
          )}
          <button className="btn-ghost header-action" onClick={onOpenProfile}>
            <span aria-hidden>👤</span>
            <span className="btn-label">پروفایل</span>
          </button>
          <button className="btn-ghost header-action" onClick={onLogout}>
            <span aria-hidden>↩</span>
            <span className="btn-label">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}