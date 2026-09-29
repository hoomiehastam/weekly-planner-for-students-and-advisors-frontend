import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import AdvisorDashboard from './pages/AdvisorDashboard.jsx';
import InstituteDashboard from './pages/InstituteDashboard.jsx';
import ParentDashboard from './pages/ParentDashboard.jsx';
import DepositPage from './pages/DepositPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SessionLoadingScreen from './components/SessionLoadingScreen.jsx';
import { useAuth } from './context/AuthContext.jsx';

function HomeRedirect() {
  const { auth, loading } = useAuth();
  if (loading) {
    return <SessionLoadingScreen />;
  }
  // بازدیدکننده‌ی مهمان اول صفحه‌ی معرفی را می‌بیند، نه مستقیماً فرم ورود
  if (!auth) return <LandingPage />;
  if (auth.user.role === 'STUDENT') return <Navigate to="/student" replace />;
  if (auth.user.role === 'INSTITUTE_MANAGER') return <Navigate to="/institute" replace />;
  if (auth.user.role === 'PARENT') return <Navigate to="/parent" replace />;
  return <Navigate to="/advisor" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* تغییر رمز اجباری بعد از ورود با OTP — محافظت‌شده ولی allowedRoles ندارد
            تا ProtectedRoute فقط چک کند کاربر لاگین‌شده باشد (و در حالت mustChangePassword
            خودش به اینجا redirect می‌شود). */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advisor"
          element={
            <ProtectedRoute allowedRoles={['ADVISOR', 'SUPERADMIN']}>
              <AdvisorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/institute"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTE_MANAGER']}>
              <InstituteDashboard />
            </ProtectedRoute>
          }
        />

        {/* پنل والد — فقط-خواندنی؛ اتصال با کد دعوت فرزند */}
        <Route
          path="/parent"
          element={
            <ProtectedRoute allowedRoles={['PARENT']}>
              <ParentDashboard />
            </ProtectedRoute>
          }
        />

        {/* صفحه‌ی واریز/تمدید — برای همه‌ی نقش‌ها (به‌جز مهمان) باز است؛
            حتی وقتی اشتراک منقضی شده کاربر باید بتواند به اینجا بیاید و تمدید کند.
            سوپرادمین هم برای دیدن صف تأیید می‌آید. */}
        <Route
          path="/deposit"
          element={
            <ProtectedRoute>
              <DepositPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
