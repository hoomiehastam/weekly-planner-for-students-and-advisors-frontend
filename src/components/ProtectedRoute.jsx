import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionLoadingScreen from './SessionLoadingScreen';
import OfflineScreen from './OfflineScreen';
import ExpiredSubscriptionModal from './ExpiredSubscriptionModal';

// اگر کاربر وارد نشده یا نقشش مجاز نیست، به‌جای نمایش صفحه، به مسیر مناسب هدایت می‌شود.
// تا وقتی جلسه از سرور چک می‌شود (authLoading)، یک placeholder نشان می‌دهیم تا پرش‌های ناخواسته نشود.
//
// مهم: اگر mustChangePassword=true باشد (یعنی کاربر با OTP وارد شده و هنوز رمز جدید نگذاشته)،
// کاربر را به /change-password هدایت می‌کنیم — مگر اینکه همین الان آنجا باشد.
export default function ProtectedRoute({ allowedRoles, children }) {
  const { auth, loading, connectionError, retrying, retrySession, expired } = useAuth();
  const location = useLocation();

  if (loading) {
    return <SessionLoadingScreen />;
  }

  // اینترنت/سرور در دسترس نیست: به صفحه‌ی ورود نمی‌فرستیم، فقط «تلاش دوباره» نشان می‌دهیم
  if (!auth && connectionError) {
    return <OfflineScreen onRetry={retrySession} retrying={retrying} />;
  }

  if (!auth) {
    // مهمان: به صفحه‌ی ورود می‌رویم ولی مسیر هدف را با خودش حمل می‌کنیم تا
    // بعد از ورود موفق، لنگوئینگ به همان صفحه‌ی درخواست‌شده برگردد (نه همیشه /student).
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  // کاربر لاگین‌شده ولی باید رمزش را عوض کند — به /change-password هدایت
  if (auth.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // استثنا: نماینده‌ی (سردار) مؤسسه نقش INSTITUTE_MANAGER ندارد، ولی اختیارات مدیریتی
  // مؤسسه را دارد — پنل مؤسسه برای او هم باز می‌شود (سمت سرور هم چک می‌شود).
  const isLeader = allowedRoles?.includes('INSTITUTE_MANAGER')
    && auth.user.ledInstitute != null;

  if (allowedRoles && !allowedRoles.includes(auth.user.role) && !isLeader) {
    return <Navigate to="/" replace />;
  }

  // اشتراک تمام شده: به‌جای پنل کاری (که سرور برایش ۴۰۳ می‌دهد) پنجره‌ی پایان اشتراک نشان داده می‌شود.
  // صفحه‌ی واریز و تغییر رمز باز می‌مانند تا کاربر بتواند تمدید کند.
  if (expired && location.pathname !== '/deposit' && location.pathname !== '/change-password') {
    return <ExpiredSubscriptionModal />;
  }

  return children;
}