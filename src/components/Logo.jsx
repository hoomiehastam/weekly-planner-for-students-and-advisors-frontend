// لوگوی رسمی و جدید دانش‌آموزینو
// نمادهای ۱۰۰٪ واضح و عیان: کلاه فارغ‌التحصیلی دانشگاهی (Mortarboard) با منگوله طلایی + کتاب باز دانایی با نوار نشانه‌گذار + ستاره رتبه برتر
export default function Logo({ size = 40, title = '', variant = 'badge', className = '' }) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-logo-svg ${className}`.trim()}
      {...a11y}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="dz-cap-bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="45%" stopColor="#2E1065" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="dz-cap-border" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#312E81" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="dz-cap-l" x1="24" y1="28" x2="64" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="dz-cap-r" x1="64" y1="28" x2="104" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#3730A3" />
        </linearGradient>
        <linearGradient id="dz-gold-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="dz-page-l" x1="26" y1="76" x2="64" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2FF" />
        </linearGradient>
        <linearGradient id="dz-page-r" x1="64" y1="76" x2="102" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <filter id="dz-star-glow" x="44" y="2" width="40" height="40" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
      </defs>

      {/* بستر نشان (Squircle) در حالت پیش‌فرض badge */}
      {variant !== 'flat' && (
        <>
          <rect x="2" y="2" width="124" height="124" rx="28" fill="url(#dz-cap-bg)" />
          <rect x="2.5" y="2.5" width="123" height="123" rx="27.5" stroke="url(#dz-cap-border)" strokeWidth="1.5" />
        </>
      )}

      {/* ستاره درخشان رتبه برتر و موفقیت در نوک کلاه */}
      <g filter="url(#dz-star-glow)">
        <path d="M64 8 L66.5 15.5 L74 18 L66.5 20.5 L64 28 L61.5 20.5 L54 18 L61.5 15.5 Z" fill="url(#dz-gold-grad)" />
        <circle cx="64" cy="18" r="1.8" fill="#FFFFFF" />
      </g>

      {/* کلاه فارغ‌التحصیلی: کاسه زیرین کلاه */}
      <path d="M44 46 L44 55 C44 64 84 64 84 55 L84 46 C76 51 52 51 44 46 Z" fill="#24205C" />
      <path d="M44 55 C44 64 84 64 84 55" stroke="#4338CA" strokeWidth="1.5" fill="none" />

      {/* صفحه الماسی روی کلاه (Mortarboard Rhombus) با زاویه سه‌بعدی و نورپردازی چپ و راست */}
      <path d="M64 24 L24 40 L64 56 Z" fill="url(#dz-cap-l)" />
      <path d="M64 24 L104 40 L64 56 Z" fill="url(#dz-cap-r)" />
      <path d="M64 24 L104 40 L64 56 L24 40 Z" stroke="#818CF8" strokeWidth="1.2" strokeLinejoin="round" />

      {/* دکمه مرکزی کلاه */}
      <circle cx="64" cy="40" r="3.5" fill="url(#dz-gold-grad)" />

      {/* منگوله طلایی کلاه با ریسمان خمیده و آویزان به سمت راست */}
      <path
        d="M64 40 C76 41 88 44 94 48 C97 50 97 56 96 64"
        stroke="url(#dz-gold-grad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="96" cy="65" r="2" fill="url(#dz-gold-grad)" />
      <path d="M94 67 L98 67 L99 77 C99 79 93 79 93 77 Z" fill="url(#dz-gold-grad)" />

      {/* کتاب باز: عطف و ضخامت جلد کتاب در پایه */}
      <path
        d="M22 98 C40 102 54 105 64 108 C74 105 88 102 106 98 L106 103 C88 107 74 110 64 113 C54 110 40 107 22 103 Z"
        fill="#312E81"
      />
      <path
        d="M24 94 C42 98 54 101 64 104 C74 101 86 98 104 94 L104 98 C86 102 74 105 64 108 C54 105 42 102 24 98 Z"
        fill="#4338CA"
      />

      {/* ورق چپ کتاب باز */}
      <path
        d="M64 80 C52 76 38 72 24 74 C23 74 22 75 22 76 L22 95 C22 96 23 97 24 97 C38 95 52 99 64 103 Z"
        fill="url(#dz-page-l)"
        stroke="#C7D2FE"
        strokeWidth="0.8"
      />
      <line x1="30" y1="80" x2="56" y2="84" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <line x1="30" y1="85" x2="52" y2="89" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <line x1="30" y1="90" x2="48" y2="94" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

      {/* ورق راست کتاب باز */}
      <path
        d="M64 80 C76 76 90 72 104 74 C105 74 106 75 106 76 L106 95 C106 96 105 97 104 97 C90 95 76 99 64 103 Z"
        fill="url(#dz-page-r)"
        stroke="#C7D2FE"
        strokeWidth="0.8"
      />
      <line x1="72" y1="84" x2="98" y2="80" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <line x1="76" y1="89" x2="98" y2="85" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <line x1="80" y1="94" x2="98" y2="90" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

      {/* شیار میانی عطف کتاب */}
      <line x1="64" y1="80" x2="64" y2="103" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" />

      {/* روبان نشانه‌گذار کتاب (Bookmark Ribbon) با برش V شکل */}
      <path d="M61 103 L61 116 L64 113 L67 116 L67 103 Z" fill="url(#dz-gold-grad)" />
    </svg>
  );
}
