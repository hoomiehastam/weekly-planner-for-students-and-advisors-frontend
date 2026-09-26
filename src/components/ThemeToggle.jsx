import { useTheme } from '../context/ThemeContext';

// دکمه‌ی toggle برای تغییر بین دارک و لایت مود
// آیکون به‌صورت SVG رندر می‌شود تا در تمام مرورگرها و فونت‌ها دقیقاً وسط دکمه‌ی دایره‌ای قرار گیرد —
// اموجی‌ها به‌خاطر فضای descender داخلی‌شان در فونت‌های مختلف بیرون از مرکز می‌افتادند.
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
      aria-label="تغییر تم"
      type="button"
    >
      <svg
        className="theme-toggle-icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isDark ? (
          // آیکون خورشید (حالت روشن)
          <>
            <circle cx="12" cy="12" r="4.2" />
            <line x1="12" y1="2.5" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="21.5" />
            <line x1="2.5" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="21.5" y2="12" />
            <line x1="5.1" y1="5.1" x2="6.9" y2="6.9" />
            <line x1="17.1" y1="17.1" x2="18.9" y2="18.9" />
            <line x1="5.1" y1="18.9" x2="6.9" y2="17.1" />
            <line x1="17.1" y1="6.9" x2="18.9" y2="5.1" />
          </>
        ) : (
          // آیکون ماه (حالت تیره)
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
  );
}
