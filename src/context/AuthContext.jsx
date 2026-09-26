import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, logoutApi, setUnauthorizedHandler, setSubscriptionExpiredHandler } from '../api/client';

const AuthContext = createContext(null);

// جلسه دیگر در جاوااسکریپت نگه داشته نمی‌شود؛ توکن در کوکی httpOnly مرورگر است.
// در زمان mount با /api/auth/me بررسی می‌کنیم که آیا جلسه‌ی معتبری وجود دارد یا نه.
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null); // { user, mustChangePassword }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getMe()
      .then((data) => {
        if (active) {
          setAuth({
            user: data.user,
            mustChangePassword: data.user.mustChangePassword === true,
            access: data.access || null,
          });
        }
      })
      .catch(() => {
        if (active) setAuth(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // وقتی توکن نامعتبر می‌شود (۴۰۱)، جلسه بسته می‌شود.
    // ProtectedRoute کاربر را به /login هدایت می‌کند.
    setUnauthorizedHandler(() => setAuth(null));
    // وقتی سرور SUBSCRIPTION_EXPIRED برگرداند، کاربر به صفحه‌ی واریز هدایت می‌شود
    // (مسیرهای تمدید با اشتراک منقضی هم باز می‌مانند — مستثنا در بک‌اند)
    setSubscriptionExpiredHandler(() => {
      window.location.assign('/deposit');
    });
  }, []);

  function login({ user, access }) {
    setAuth({
      user,
      mustChangePassword: user.mustChangePassword === true,
      access: access || null,
    });
  }

  // خروج: پاک‌کردن جلسه — redirect به /login بر عهده‌ی صفحات است
  async function logout() {
    try {
      await logoutApi();
    } catch {
      // حتی اگر درخواست خروج با خطا مواجه شود، جلسه‌ی محلی باید بسته شود
    }
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

  return (
    <AuthContext.Provider
      value={{ auth, loading, login, logout, updateUser, clearMustChangePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}