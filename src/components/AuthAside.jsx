import { useEffect, useState } from 'react';

// پنل برند کنار فرم‌های ورود/ثبت‌نام — اسلایدر خودکار با نقطه‌های قابل کلیک.
// props: focus → شماره‌ی اسلایدی که باید نمایش داده شود (مثلاً بر اساس نقش انتخاب‌شده در ثبت‌نام)
const SLIDES = [
  { icon: 'target', title: ['هر روز، یک قدم', 'نزدیک‌تر به هدف'], sub: 'بیش از هزار داوطلب کنکور همین حالا برنامه‌شان را اینجا دنبال می‌کنند.' },
  { icon: 'calendar-check', title: ['برنامه‌ات را بگیر،', 'انجامش بده'], sub: 'مشاورت برنامه‌ی هفتگی می‌سازد؛ تو با دو تیک، دقیقه و تست‌هایت را ثبت می‌کنی.' },
  { icon: 'messages', title: ['به‌جای ۳۰ چت واتساپ،', 'یک پنل'], sub: 'مشاور همه‌ی شاگردهایش را با آمارشان یک‌جا می‌بیند و یادآور مستقیم می‌فرستد.' },
];
const INTERVAL_MS = 5500;

export default function AuthAside({ focus = 0 }) {
  const [index, setIndex] = useState(focus);
  const [paused, setPaused] = useState(false);

  useEffect(() => setIndex(focus), [focus]);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduced) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearTimeout(t); // با هر تغییر اسلاید (یا کلیک روی نقطه) شمارش از نو شروع می‌شود
  }, [index, paused]);

  return (
    <aside
      className="auth-split-aside"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="asa-brand">
        <span className="asa-mark" aria-hidden>د</span>
        <span>دانش‌آموزینو</span>
      </div>

      <div className="asa-lead" role="group" aria-roledescription="carousel" aria-label="معرفی دانش‌آموزینو">
        {SLIDES.map((s, i) => (
          <div key={s.icon} className={`asa-slide ${i === index ? 'on' : ''}`} aria-hidden={i !== index}>
            <span className="asa-chip" aria-hidden><i className={`ti ti-${s.icon}`} /></span>
            <p className="asa-title">{s.title[0]} <br />{s.title[1]}</p>
            <p className="asa-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="asa-dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.icon}
            type="button"
            className={i === index ? 'on' : ''}
            aria-label={`اسلاید ${i + 1} از ${SLIDES.length}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </aside>
  );
}
