import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearAllDrafts } from '../utils/drafts';
import {
  clearOfflineData,
  loadOfflineUser,
  saveOfflineUser,
} from '../utils/offlineCache';
import { getMe, logoutApi, setUnauthorizedHandler, setSubscriptionExpiredHandler } from '../api/client';

const AuthContext = createContext(null);

// فقط دانش‌آموز می‌تواند بدون اینترنت پنل را (به‌صورت فقط‌خواندنی) باز کند
function rememberForOffline(user, access) {
  if (user?.role === 'STUDENT' && user.mustChangePassword !== true) {
    saveOfflineUser(user, access);
  }
}

// جلسه دیگر در جاوااسکریپت نگه داشته نمی‌شود؛ توکن در کوکی httpOnly مرورگر است.
// در زمان mount با /api/auth/me بررسی می‌کنیم که آیا جلسه‌ی معتبری وجود دارد یا نه.
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null); // { user, mustChangePassword, access }
  const [loading, setLoading] = useState(true);
  // true یعنی نتوانستیم جلسه را بررسی کنیم (اینترنت قطع است یا سرور در دسترس نیست)
  // — این با «جلسه نامعتبر است» فرق دارد و کاربر نباید به صفحه‌ی ورود فرستاده شود
  const [connectionError, setConnectionError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // true یعنی دانش‌آموز بدون اینترنت با اطلاعات ذخیره‌شده‌ی آخرین ورود وارد شده (فقط‌خواندنی)
  const [offlineMode, setOfflineMode] = useState(false);
  // true یعنی سرور در همین نشست با کد SUBSCRIPTION_EXPIRED جواب داده (اشتراک وسط کار تمام شده)
  const [expiredFlag, setExpiredFlag] = useState(false);

  const loadSession = useCallback(() => {
    return getMe()
      .then((data) => {
        setConnectionError(false);
        setOfflineMode(false);
        setAuth({
          user: data.user,
          mustChangePassword: data.user.mustChangePassword === true,
          access: data.access || null,
        });
        rememberForOffline(data.user, data.access);
      })
      .catch((err) => {
        // خطای شبکه (بدون وضعیت) یا خرابی سرور (۵xx) ← جلسه را پاک نکن
        const unreachable = !err?.status || err.status >= 500;
        if (unreachable) {
          const cached = loadOfflineUser();
          if (cached) {
            // دانش‌آموزی که قبلاً وارد شده: با آخرین اطلاعات ذخیره‌شده، فقط‌خواندنی باز می‌شود
            setConnectionError(false);
            setOfflineMode(true);
            setAuth({ user: cached.user, mustChangePassword: false, access: cached.access });
            return;
          }
          setConnectionError(true);
        } else {
          setConnectionError(false);
        }
        setOfflineMode(false);
        setAuth(null);
      })
      .finally(() => {
        setLoading(false);
        setRetrying(false);
      });
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  function retrySession() {
    setRetrying(true);
    return loadSession();
  }

  // به‌محض وصل‌شدن دوباره‌ی اینترنت، خودکار تلاش کن
  useEffect(() => {
    if (!connectionError && !offlineMode) return undefined;
    const onOnline = () => retrySession();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionError, offlineMode]);

  // بازخوانی وضعیت اشتراک از سرور. برمی‌گرداند: true=دسترسی دارد، false=ندارد، null=نتوانستیم بپرسیم
  const refreshAccess = useCallback(async () => {
    try {
      const data = await getMe();
      setAuth((prev) =>
        prev ? { ...prev, user: { ...prev.user, ...data.user }, access: data.access || null } : prev
      );
      const hasAccess = data.access?.hasAccess !== false;
      if (hasAccess) setExpiredFlag(false);
      return hasAccess;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // وقتی توکن نامعتبر می‌شود (۴۰۱)، جلسه بسته می‌شود.
    // ProtectedRoute کاربر را به /login هدایت می‌کند. اطلاعات آفلاین هم پاک می‌شود
    // تا با جلسه‌ی منقضی‌شده نشود وارد پنل شد.
    setUnauthorizedHandler(() => {
      clearOfflineData();
      setOfflineMode(false);
      setAuth(null);
    });
    // وقتی سرور SUBSCRIPTION_EXPIRED برگرداند، پنجره‌ی «اشتراک شما به پایان رسیده» نشان داده می‌شود
    // (ProtectedRoute آن را نمایش می‌دهد؛ مسیرهای تمدید با اشتراک منقضی هم باز می‌مانند — مستثنا در بک‌اند)
    setSubscriptionExpiredHandler(() => setExpiredFlag(true));
  }, []);

  function login({ user, access }) {
    setExpiredFlag(false);
    setOfflineMode(false);
    setAuth({
      user,
      mustChangePassword: user.mustChangePassword === true,
      access: access || null,
    });
    rememberForOffline(user, access);
    // پاسخ ورود اطلاعات اشتراک ندارد؛ برای اینکه اگر اشتراک تمام شده، همان اول
    // پنجره‌ی پایان اشتراک نشان داده شود، وضعیت را یک بار از سرور می‌گیریم
    if (!access) refreshAccess();
  }

  // خروج: پاک‌کردن جلسه — redirect به /login بر عهده‌ی صفحات است
  async function logout() {
    try {
      await logoutApi();
    } catch {
      // حتی اگر درخواست خروج با خطا مواجه شود، جلسه‌ی محلی باید بسته شود
    }
    // خروج عمدی: پیش‌نویس‌ها و اطلاعات آفلاین پاک می‌شوند (دستگاه ممکن است مشترک باشد).
    // انقضای خودکار نشست پیش‌نویس‌ها را پاک نمی‌کند تا کار نیمه‌کاره بعد از ورود دوباره برگردد.
    clearAllDrafts();
    clearOfflineData();
    setExpiredFlag(false);
    setOfflineMode(false);
    setAuth(null);
  }

  // به‌روزرسانی اطلاعات کاربر پس از ویرایش پروفایل
  function updateUser(updatedUser) {
    setAuth((prev) => {
      if (!prev) return prev;
      return { ...prev, user: { ...prev.user, ...updatedUser } };
    });
  }

  // پاک‌کردن پرچم mustChangePassword بعد از تعیین رمز جدید
  function clearMustChangePassword() {
    setAuth((prev) => {
      if (!prev) return prev;
      return { ...prev, mustChangePassword: false };
    });
  }

  // اشتراک تمام شده: یا سرور همین را در پاسخ /me گفته، یا در همین نشست با ۴۰۳ جواب داده
  const expired = !!auth && (expiredFlag || auth.access?.hasAccess === false);

  return (
    <AuthContext.Provider
      value={{
        auth,
        loading,
        connectionError,
        retrying,
        retrySession,
        offlineMode,
        expired,
        refreshAccess,
        login,
        logout,
        updateUser,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
