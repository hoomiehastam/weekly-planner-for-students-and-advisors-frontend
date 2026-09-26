import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

// بارگذاری تم از localStorage یا prefers-color-scheme
function getInitialTheme() {
  try {
    const stored = localStorage.getItem('konkur-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // دسترسی به localStorage در محیط‌های بدون ذخیره‌سازی (مثل SSR) ممکن است خطا بدهد؛ نادیده گرفته می‌شود
  }
  // پیش‌فرض: از تنظیمات سیستم استفاده کن
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    // اعمال تم روی document
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem('konkur-theme', theme);
    } catch {
      // ذخیره‌ی تم ممکن است در حالت امتساعی/خصوصی ناموفق باشد؛ خطا مهم نیست
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
