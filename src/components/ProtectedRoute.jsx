import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionLoadingScreen from './SessionLoadingScreen';

// اگر کاربر وارد نشده یا نقشش مجاز نیست، به‌جای نمایش صفحه، به مسیر مناسب هدایت می‌شود.
// تا وقتی جلسه از سرور چک می‌شود (authLoading)، یک placeholder نشان می‌دهیم تا پرش‌های ناخواسته نشود.
//
// مهم: اگر mustChangePassword=true باشد (یعنی کاربر با OTP وارد شده و هنوز رمز جدید نگذاشته)،
// کاربر را به /change-password هدایت می‌کنیم — مگر اینکه همین الان آنجا باشد.
export default function ProtectedRoute({ allowedRoles, children }) {
  const { auth, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <SessionLoadingScreen />;
  }

  if (!auth) {
    return <Navigate to="/login" replace />;
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

  return children;
}