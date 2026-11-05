import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { getInitials } from './PlanBits';
import { formatJalaliDate } from '../utils/jalali';
import { useAuth } from '../context/AuthContext';
import { brandForRole } from '../utils/brand';
import Ico from './Ico';
import InstallButton from './InstallButton';
import OnboardingGuide, { useOnboardingGuide } from './OnboardingGuide';
import PanelMenu from './PanelMenu';
import AccountMenu from './AccountMenu';

// هدر مشترک داشبوردها. برند بخش (دانش‌آموزینو/مشاور دانش‌آموزینو) + اطلاعات کاربر + پروفایل و خروج.
// props:
//   fullName     نام کامل کاربر
//   greeting     متن تبریک (مثل «سلام، علی!»)
//   avatarClass  کلاس اضافی برای آواتار (مثل advisor-avatar)
//   menuItems / activeMenu / onMenuSelect / menuTitle  منوی همبرگری بخش‌ها
//   onOpenProfile  بازکردن مودال پروفایل
//   onLogout       خروج از حساب
export default function AppHeader({
  fullName, greeting, avatarClass = '', onOpenProfile, onLogout,
  menuItems = [], activeMenu, onMenuSelect, menuTitle,
}) {
  const { auth } = useAuth();
  const guide = useOnboardingGuide(auth?.user, auth?.mustChangePassword);
  const brand = brandForRole(auth?.user?.role);
  const photoUrl = auth?.user?.photoUrl;
  const navigate = useNavigate();
  // سوپرادمین اشتراک ندارد ولی صفحه‌ی واریز برایش «صف تأیید رسیدها»ست؛ پس دکمه برای او هم هست
  const isSuperadmin = auth?.user?.role === 'SUPERADMIN';

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          {/* منوی همبرگری: هر بخش پنل یک صفحه‌ی جدا */}
          <PanelMenu items={menuItems} active={activeMenu} onSelect={onMenuSelect} title={menuTitle || 'منو'} />
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
        {/* موبایل: فقط تغییر تم + منوی کوچک حساب (بقیه‌ی دکمه‌ها داخل آن) */}
        <div className="header-mobile-actions">
          <ThemeToggle />
          <AccountMenu
            extra={<InstallButton />}
            items={[
              ...(guide.hasGuide ? [{ key: 'guide', label: 'راهنمای استفاده از پنل', icon: <i className="ti ti-help-circle" />, onClick: guide.show }] : []),
              { key: 'deposit', label: isSuperadmin ? 'رسیدهای واریز' : 'واریز و تمدید اشتراک', icon: '💳', onClick: () => navigate('/deposit') },
              { key: 'profile', label: 'پروفایل', icon: '👤', onClick: onOpenProfile },
              { key: 'logout', label: 'خروج از حساب', icon: '↩', danger: true, onClick: onLogout },
            ]}
          />
        </div>
        <div className="header-actions" data-tour="header-actions">
          <ThemeToggle />
          {/* نصب برنامه روی گوشی — فقط وقتی ممکن و هنوز انجام‌نشده باشد نمایش داده می‌شود */}
          <InstallButton />
          {/* راهنمای کار با پنل — برای دانش‌آموز، مشاور و والد */}
          {guide.hasGuide && (
            <button
              type="button"
              className="btn-ghost header-action"
              onClick={guide.show}
              title="راهنمای استفاده از پنل"
            >
              <span aria-hidden><i className="ti ti-help-circle ico" /></span>
              <span className="btn-label">راهنما</span>
            </button>
          )}
          {/* صفحه‌ی واریز/تمدید اشتراک — برای همه‌ی نقش‌ها جز سوپرادمین؛
              کاربر با اشتراک منقضی هم از همین‌جا تمدید می‌کند */}
          <button
            className="btn-ghost header-action"
            data-tour="deposit"
            onClick={() => navigate('/deposit')}
            title={isSuperadmin ? 'رسیدهای واریز دریافتی' : 'واریز و تمدید اشتراک'}
          >
            <span aria-hidden><Ico e="💳" /></span>
            <span className="btn-label">{isSuperadmin ? 'رسیدهای واریز' : 'واریز'}</span>
          </button>
          <button className="btn-ghost header-action" data-tour="profile-btn" onClick={onOpenProfile}>
            <span aria-hidden><Ico e="👤" /></span>
            <span className="btn-label">پروفایل</span>
          </button>
          <button className="btn-ghost header-action" onClick={onLogout}>
            <span aria-hidden><Ico e="↩" /></span>
            <span className="btn-label">خروج</span>
          </button>
        </div>
      </div>
      <OnboardingGuide
        role={auth?.user?.role}
        userId={auth?.user?.id}
        open={guide.open}
        part={guide.part}
        onClose={guide.close}
      />
    </header>
  );
}