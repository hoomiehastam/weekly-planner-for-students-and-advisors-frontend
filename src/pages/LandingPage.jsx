import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import InstallButton from '../components/InstallButton';
import Logo from '../components/Logo';
import KonkurCountdownBanner from '../components/landing/KonkurCountdownBanner';
import { toFaDigits } from '../utils/jalali';
import { useAuth } from '../context/AuthContext';
import { MASTER_BRAND } from '../utils/brand';
import Ico from '../components/Ico';

// صفحه‌ی لندینگ مدرن و روایی — همراه با «کیان» (دانش‌آموز واقعی همین پنل):
// بازدیدکننده مسیر شفاف و واقعی مطالعه و تعامل با مشاور را می‌بیند.
export default function LandingPage() {
  const { auth } = useAuth();
  const [showTop, setShowTop] = useState(false);

  // تسک‌های تعاملی پیش‌نمایش در هیرو
  const [heroTasks, setHeroTasks] = useState([
    { id: 1, subject: 'ریاضی', topic: 'کاربرد مشتق و بهینه‌سازی', time: '۸:۰۰ تا ۹:۳۰', tag: 'تمرین', done: true },
    { id: 2, subject: 'زیست‌شناسی', topic: 'ژنتیک و بیان ژن', time: '۱۰:۰۰ تا ۱۱:۳۰', tag: 'تست', done: true },
    { id: 3, subject: 'شیمی', topic: 'استوکیومتری و تعادل‌ها', time: '۱۲:۰۰ تا ۱۳:۱۵', tag: 'پیشروی', done: false },
    { id: 4, subject: 'فیزیک', topic: 'تست‌های دینامیک و اصطکاک', time: '۱۶:۰۰ تا ۱۷:۳۰', tag: 'تست', done: false },
  ]);

  const toggleHeroTask = (id) => {
    setHeroTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const doneCount = heroTasks.filter((t) => t.done).length;
  const progressPercent = Math.round((doneCount / heroTasks.length) * 100);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // اسکرول نرم بدون خراب کردن روت هش در HashRouter
  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // هدایت کاربر لاگین‌شده به پنل خودش
  const dashboardPath =
    auth?.user?.role === 'STUDENT'
      ? '/student'
      : auth?.user?.role === 'PARENT'
        ? '/parent'
        : '/advisor';

  return (
    <div className="landing-page">
      {/* هاله‌های نوری شناور پس‌زمینه (Aurora Mesh Effect) */}
      <div className="aurora-glow glow-top" aria-hidden="true" />
      <div className="aurora-glow glow-middle" aria-hidden="true" />

      {/* ---------- هدر شناور و مدرن ---------- */}
      <header className="landing-header">
        <div className="landing-nav">
          <div className="brand">
            <Logo size={36} title="دانش‌آموزینو" />
            <h2>{MASTER_BRAND}</h2>
          </div>

          <nav className="landing-nav-links" aria-label="ناوبری صفحه">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>امکانات</a>
            <a href="#week" onClick={(e) => scrollToSection(e, 'week')}>یک هفته با کیان</a>
            <a href="#students" onClick={(e) => scrollToSection(e, 'students')}>برای دانش‌آموز</a>
            <a href="#advisors" onClick={(e) => scrollToSection(e, 'advisors')}>برای مشاور</a>
          </nav>

          <div className="landing-nav-actions">
            <ThemeToggle />
            <InstallButton variant="landing" />
            {auth ? (
              <Link to={dashboardPath} className="btn-primary landing-cta-sm">
                ورود به پنل
              </Link>
            ) : (
              <div className="landing-auth-group">
                <Link to="/login" className="landing-login-btn">
                  ورود
                </Link>
                <Link to="/register?role=STUDENT" className="btn-primary landing-cta-sm">
                  ثبت‌نام رایگان
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ---------- بخش هیرو (Hero Section) ---------- */}
        <section className="landing-hero">
          <div className="landing-container">
            <div className="hero-center">
              <KonkurCountdownBanner />

              <div className="hero-kicker-badge">
                <span className="badge-pulse-dot" />
                <span>سامانه‌ی هوشمند برنامه‌ریزی کنکور و همراهی مشاور</span>
              </div>

              <h1 className="landing-title">
                برنامه‌ریزی دقیق کنکور؛
                <br />
                <span className="gradient-highlight">نه در چت‌های شلوغ، در پنل اختصاصی تو</span>
              </h1>

              <p className="landing-subtitle">
                مشاورت برنامه‌ی هفتگی‌ات را تا دقیقه‌اش می‌چیند، تو با چند تیک اجرایش می‌کنی،
                در آزمون‌های زمان‌دار خودت را می‌سنجی و نمودار واقعی پیشرفتت را دنبال می‌کنی.
              </p>

              <div className="landing-hero-actions">
                <Link to="/register?role=STUDENT" className="cta-button cta-student-glow">
                  <span>شروع رایگان دانش‌آموز</span>
                  <span className="cta-arrow" aria-hidden>←</span>
                </Link>
                <Link to="/register?role=ADVISOR" className="btn-secondary landing-btn-advisor">
                  <Ico e="🏫" />
                  <span>پنل ویژه مشاوران و آموزشگاه‌ها / مدارس</span>
                </Link>
              </div>
            </div>

            {/* کارت پیش‌نمایش زنده و سه‌بعدی پنل دانش‌آموز */}
            <div className="hero-mockup-wrapper">
              <div className="mockup-float-badge badge-top-right">
                <span className="float-icon">🔥</span>
                <div>
                  <strong>۵ روز پیوسته</strong>
                  <small>زنجیره‌ی مطالعه کیان</small>
                </div>
              </div>

              <div className="mockup-float-badge badge-bottom-left">
                <span className="float-icon">💬</span>
                <div>
                  <strong>یادداشت مشاور:</strong>
                  <small>«تحلیل تست‌های مشتق عالی بود؛ خسته نباشی کیان جان»</small>
                </div>
              </div>

              <div className="hero-preview-card">
                <div className="mockup-window-bar">
                  <div className="window-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <div className="window-tab-title">
                    <Ico e="📅" /> برنامه‌ی امروز کیان — شنبه
                  </div>
                  <div className="window-progress-pill">
                    <span>پیشرفت روز:</span>
                    <strong>{toFaDigits(progressPercent)}٪</strong>
                  </div>
                </div>

                <div className="hero-preview-content">
                  <div className="preview-tasks-header">
                    <span className="tasks-summary-count">
                      {toFaDigits(doneCount)} از {toFaDigits(heroTasks.length)} بازه کامل شده
                    </span>
                    <span className="interactive-hint">برای تست، روی بازه‌ها کلیک کن!</span>
                  </div>

                  <div className="hero-preview-rows">
                    {heroTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`hero-preview-row ${task.done ? 'is-done' : ''}`}
                        onClick={() => toggleHeroTask(task.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && toggleHeroTask(task.id)}
                      >
                        <span className={`hp-checkbox ${task.done ? 'checked' : ''}`}>
                          {task.done ? <Ico e="✓" /> : null}
                        </span>
                        <div className="hp-info">
                          <strong className="hp-subject">{task.subject}</strong>
                          <span className="hp-topic">{task.topic}</span>
                        </div>
                        <div className="hp-meta">
                          <span className="hp-time">{toFaDigits(task.time)}</span>
                          <span className={`tag-pill tag-${task.tag === 'تمرین' ? 'indigo' : task.tag === 'تست' ? 'amber' : 'sage'}`}>
                            {task.tag}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- نوار ارزش‌ها و ویژگی‌های کلیدی پلتفرم ---------- */}
        <section className="landing-metrics-bar">
          <div className="landing-container metrics-row">
            <div className="metric-item">
              <span className="metric-num">&lt; {toFaDigits(5)} ثانیه</span>
              <span className="metric-label">زمان ثبت هر پارت مطالعه و تست</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <span className="metric-num">PWA</span>
              <span className="metric-label">نصب مستقیم روی گوشی و وب بدون اپ‌استور</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <span className="metric-num">آفلاین</span>
              <span className="metric-label">ذخیره‌ی خودکار و کارکرد هنگام قطعی اینترنت</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <span className="metric-num">۱۰۰٪</span>
              <span className="metric-label">محیط متمرکز، بدون تبلیغات و حاشیه‌ها</span>
            </div>
          </div>
        </section>

        {/* ---------- بخش امکانات به سبک بنتو (Bento Grid) ---------- */}
        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="section-head-center">
              <span className="section-pill">چرا دانش‌آموزینو؟</span>
              <h2 className="landing-section-title">
                هر آنچه برای <em>رسیدن به رتبه دلخواهت</em> نیاز داری
              </h2>
              <p className="landing-section-sub">
                ترکیب برنامه‌ریزی علمی، نظارت مستمر مشاور و ابزارهای روان برای حداکثر تمرکز کنکوری‌ها.
              </p>
            </div>

            <div className="bento-grid">
              {/* کارت ۱: بزرگ */}
              <div className="bento-card bento-card-wide card-indigo">
                <div className="bento-card-content">
                  <span className="bento-icon"><Ico e="🗓" /></span>
                  <h3>برنامه‌ی دقیق تا دقیقه — بدون ابهام</h3>
                  <p>
                    دیگر هیچ‌وقت نمی‌پرسی «الان باید چی بخونم؟». مشاور برنامه‌ی هفته را با ساعت دقیق
                    شروع، پایان، درس، فصل و مبحث می‌چیند و همه‌چیز جلوی چشم توست.
                  </p>
                  <div className="bento-mock-pills">
                    <span className="mock-pill">۸:۰۰ تا ۹:۳۰ · حسابان</span>
                    <span className="mock-pill">۹:۴۵ تا ۱۱:۰۰ · فیزیک</span>
                    <span className="mock-pill">۱۱:۱۵ تا ۱۲:۳۰ · شیمی</span>
                  </div>
                </div>
              </div>

              {/* کارت ۲ */}
              <div className="bento-card card-amber">
                <div className="bento-card-content">
                  <span className="bento-icon"><Ico e="⚡" /></span>
                  <h3>ثبت پیشرفت در ۵ ثانیه</h3>
                  <p>
                    کاغذ و دفترهای شلوغ ثبت ساعات مطالعه را کنار بگذار. فقط یک تیک برای بازه و یک عدد
                    برای تعداد تست؛ تمام!
                  </p>
                </div>
              </div>

              {/* کارت ۳ */}
              <div className="bento-card card-teal">
                <div className="bento-card-content">
                  <span className="bento-icon"><Ico e="⏱" /></span>
                  <h3>شبیه‌ساز آزمون زمان‌دار</h3>
                  <p>
                    آزمون‌های زمان‌دار کلاسی و تک‌نفره با تایمر معکوس واقعی، ثبت درصدهای تستی و ارسال
                    برگه‌ی تشریحی به مشاور.
                  </p>
                </div>
              </div>

              {/* کارت ۴: عریض دوم برای پر کردن کامل ردیف ۲ */}
              <div className="bento-card bento-card-wide card-pink">
                <div className="bento-card-content">
                  <span className="bento-icon"><Ico e="📊" /></span>
                  <h3>نمودارها و آماری که دروغ نمی‌گوید</h3>
                  <p>
                    سهم دقیق هر درس و فصل از ساعات مطالعه‌ات را در نمودارهای تحلیلی هفتگی ببین تا
                    نقاط قوت و ضعفت مشخص شود.
                  </p>
                </div>
              </div>

              {/* کارت ۵: تمام‌عرض برای بستن کامل و یکدست جدول بنتو بدون هیچ فضای خالی */}
              <div className="bento-card bento-card-full card-purple">
                <div className="bento-card-content">
                  <span className="bento-icon"><Ico e="👥" /></span>
                  <h3>ارتباط مستقیم و پیوسته با مشاور</h3>
                  <p>
                    مشاور بدون نیاز به پیگیری‌های خسته‌کننده، ساعت مطالعه و درصد آزمون‌های تو را آنلاین می‌بیند
                    و مستقیماً برایت یادداشت و بازخورد ارسال می‌کند.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- تایم‌لاین روایی: یک هفته با کیان ---------- */}
        <section id="week" className="landing-section week-narrative-section">
          <div className="landing-container">
            <div className="section-head-center">
              <span className="section-pill">یک سناریوی واقعی</span>
              <h2 className="landing-section-title">
                یک هفته با <em>کیان</em> — دانش‌آموز واقعیِ همین پنل
              </h2>
              <p className="landing-section-sub">
                ببین کیان چطور در طول یک هفته برنامه‌اش را تحویل می‌گیرد، می‌خواند و به مشاورش گزارش می‌دهد:
              </p>
            </div>

            <div className="week-timeline">
              <div className="timeline-rail" aria-hidden="true" />

              {/* شنبه */}
              <div className="timeline-item">
                <span className="timeline-day">شنبه</span>
                <div className="timeline-card">
                  <div className="timeline-head">
                    <span className="timeline-emoji"><Ico e="📥" /></span>
                    <div>
                      <h3>برنامه‌ی جدید کیان از مشاور رسید</h3>
                      <p>
                        مشاور کیان برنامه‌ی هفته‌ی جاری را ساخت و در پنل منتشر کرد.
                        کیان با ورود به داشبورد، اعلان برنامه‌ی جدید را دریافت می‌کند؛ بدون نیاز به پی‌دی‌اف و پیام تلگرام.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-plan">
                    <div className="plan-row"><span className="plan-time">۱۶:۰۰–۱۷:۳۰</span><span>ریاضی — انتگرال، حل تمرین</span><span className="plan-tag tag-indigo">تمرین</span></div>
                    <div className="plan-row"><span className="plan-time">۱۸:۰۰–۱۸:۴۵</span><span>ادبیات — مرور قلمرو فکری</span><span className="plan-tag tag-sage">مرور</span></div>
                    <div className="plan-row"><span className="plan-time">۱۹:۳۰–۲۰:۳۰</span><span>شیمی — تست فصل ۱</span><span className="plan-tag tag-amber">تست</span></div>
                  </div>
                </div>
              </div>

              {/* یکشنبه */}
              <div className="timeline-item">
                <span className="timeline-day">یکشنبه</span>
                <div className="timeline-card">
                  <div className="timeline-head">
                    <span className="timeline-emoji"><Ico e="✅" /></span>
                    <div>
                      <h3>اجرا کن، تیک بزن، تمام</h3>
                      <p>
                        پایان هر پارت مطالعاتی، کیان فقط دو کار می‌کند: تیک «انجام شد» و ثبت تعداد تست.
                        همین دو عدد در چند ثانیه کل آمار هفتگی‌اش را می‌سازند.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-stats">
                    <div className="stat-mini"><strong>{toFaDigits(120)}</strong><small>دقیقه مطالعه امروز</small></div>
                    <div className="stat-mini"><strong>{toFaDigits(35)}</strong><small>تست زده‌شده</small></div>
                    <div className="stat-mini stat-mini-done"><strong>{toFaDigits(4)}</strong><small>بازه‌ی کامل‌شده</small></div>
                  </div>
                </div>
              </div>

              {/* چهارشنبه */}
              <div className="timeline-item">
                <span className="timeline-day">چهارشنبه</span>
                <div className="timeline-card timeline-card-accent">
                  <div className="timeline-head">
                    <span className="timeline-emoji"><Ico e="⏱" /></span>
                    <div>
                      <h3>آزمون شبیه‌ساز زمان‌دار</h3>
                      <p>
                        مشاور یک آزمون ۲۰سؤالی شیمی فعال کرده است. کیان با شمارش معکوس و در شرایط واقعی
                        کنکور پاسخ می‌دهد و درصد سؤالات تستی همان لحظه محاسبه می‌شود.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-exam">
                    <span className="exam-clock">{toFaDigits('14:32')}</span>
                    <div className="exam-bars">
                      <div className="exam-bar-row"><span>پاسخ‌داده</span><div className="exam-bar"><span style={{ width: '70%' }} /></div><strong>{toFaDigits(14)}</strong></div>
                      <div className="exam-bar-row"><span>بی‌پاسخ</span><div className="exam-bar"><span style={{ width: '20%' }} /></div><strong>{toFaDigits(4)}</strong></div>
                      <div className="exam-bar-row"><span>مانده</span><div className="exam-bar"><span style={{ width: '10%' }} /></div><strong>{toFaDigits(2)}</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* جمعه */}
              <div className="timeline-item">
                <span className="timeline-day">جمعه</span>
                <div className="timeline-card">
                  <div className="timeline-head">
                    <span className="timeline-emoji"><Ico e="📊" /></span>
                    <div>
                      <h3>کارنامه‌ی واقعی آخر هفته؛ بدون حدس و گمان</h3>
                      <p>
                        کیان در طول هفته ۵۴ ساعت مطالعه و ۶۵۰ تست ثبت کرده است. مشاور بدون تلف کردن وقت
                        در مکالمات طولانی، گزارش تحلیلی کیان را بررسی می‌کند و بر اساس آن برنامه‌ی هفته بعد را دقیق‌تر می‌چیند.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-week-report">
                    <div className="report-bar-col"><div className="report-bar" style={{ '--h': '60%' }} /><small>شنبه</small></div>
                    <div className="report-bar-col"><div className="report-bar" style={{ '--h': '85%' }} /><small>یکشنبه</small></div>
                    <div className="report-bar-col"><div className="report-bar" style={{ '--h': '70%' }} /><small>دوشنبه</small></div>
                    <div className="report-bar-col"><div className="report-bar" style={{ '--h': '95%' }} /><small>سه‌شنبه</small></div>
                    <div className="report-bar-col"><div className="report-bar" style={{ '--h': '80%' }} /><small>چهارشنبه</small></div>
                    <div className="report-bar-col"><div className="report-bar" style={{ '--h': '90%' }} /><small>پنجشنبه</small></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- بخش ویژه دانش‌آموزان ---------- */}
        <section id="students" className="landing-section landing-section-tinted">
          <div className="landing-container">
            <div className="section-head-center">
              <span className="section-pill">برای داوطلب کنکور</span>
              <h2 className="landing-section-title">
                چرا دانش‌آموزان <em>عاشق این پنل</em> می‌شوند؟
              </h2>
            </div>
            <div className="landing-feature-grid">
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-indigo"><Ico e="🗓" /></span>
                <h3>شروع هر روز بدون بلاتکلیفی</h3>
                <p>برنامه‌ی روزانه با تفکیک دقیق ساعت و درس، اولین چیزی است که بعد از بیدار شدن می‌بینی.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-amber"><Ico e="⚡" /></span>
                <h3>ثبت سریع و لذت‌بخش مطالعه</h3>
                <p>یک تیک برای «انجام شد» و نوشتن تعداد تست. نیازی به تایپ طولانی و یادداشت‌های کاغذی نیست.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-teal"><Ico e="📊" /></span>
                <h3>شفافیت در عملکرد واقعی</h3>
                <p>ساعات مطالعه‌ات به تفکیک درس و تگ (تست، تشریحی، مرور) دسته‌بندی می‌شود تا حس گم‌گشتگی نداشته باشی.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-pink"><Ico e="📝" /></span>
                <h3>آزمون‌های استاندارد کنکوری</h3>
                <p>تایمر شبیه‌ساز واقعی با کارنامه‌ی فوری و نمایش پاسخ‌برگ تشریحی مشاور.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- بخش ویژه مشاوران ---------- */}
        <section id="advisors" className="landing-section">
          <div className="landing-container">
            <div className="section-head-center">
              <span className="section-pill">برای مشاوران، آموزشگاه‌ها و مدارس</span>
              <h2 className="landing-section-title">
                مدیریت ده‌ها شاگرد؛ <em>بدون کاغذ، بدون آشفتگی</em>
              </h2>
            </div>
            <div className="landing-feature-grid">
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-indigo"><Ico e="👥" /></span>
                <h3>نظارت آسان بر ۵۰ شاگرد هم‌زمان</h3>
                <p>آمار هفتگی تمام دانش‌آموزان در یک نگاه؛ شاگردانی که کم‌کاری داشته‌اند بلافاصله مشخص می‌شوند.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-amber"><Ico e="✨" /></span>
                <h3>برنامه‌ساز هوشمند چندروزه</h3>
                <p>چیدمان برنامه‌ها با تکرار الگو، قابلیت کپی بازه‌ها و درگ‌وان‌دراپ روان در کسری از دقیقه.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-teal"><Ico e="🔔" /></span>
                <h3>ارسال یادآور و پیام درون پنل</h3>
                <p>بازخوردهایت را مستقیماً در داشبورد دانش‌آموز قرار بده؛ بدون اینکه میان پیام‌های پیام‌رسان‌ها گم شود.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-pink"><Ico e="✅" /></span>
                <h3>برگزاری آزمون کلاسی</h3>
                <p>یک آزمون برای تمام شاگردانتان فعال کنید؛ تستی‌ها خودکار تصحیح شده و کارنامه آماده می‌شود.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- دعوت به عمل پایانی (Final CTA) ---------- */}
        <section className="landing-final-cta">
          <div className="landing-container">
            <div className="final-cta-card">
              <div className="cta-glow-effect" aria-hidden="true" />
              <h2>همین امروز مسیر رتبه برتر شدن را آغاز کن</h2>
              <p>ثبت‌نام دانش‌آموز کمتر از یک دقیقه زمان می‌برد و دسترسی رایگان است.</p>
              <div className="landing-hero-actions landing-hero-actions-center">
                <Link to="/register?role=STUDENT" className="cta-button cta-student-glow">
                  <span>شروع رایگان دانش‌آموز</span>
                  <span className="cta-arrow" aria-hidden>←</span>
                </Link>
                <Link to="/register?role=ADVISOR" className="btn-secondary landing-btn-advisor">
                  <span>ثبت‌نام مشاور یا آموزشگاه</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- فوتر مدرن ---------- */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-row">
          <div className="brand landing-footer-brand">
            <Logo size={36} />
            <div>
              <strong>{MASTER_BRAND}</strong>
              <small>سامانه‌ی یکپارچه‌ی برنامه‌ریزی و هدایت داوطلبان کنکور سراسری</small>
            </div>
          </div>
          <p className="landing-footer-copy">
            طراحی و توسعه‌یافته برای کنکوری‌های هدفمند و مشاوران پیشرو · {toFaDigits(1405)}
          </p>
        </div>
      </footer>

      {/* دکمه‌ی شناور بازگشت به بالای صفحه */}
      <button
        type="button"
        className={`back-to-top ${showTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="بازگشت به بالای صفحه"
        title="بازگشت به بالا"
      >
        <i className="ti ti-arrow-up" aria-hidden="true" />
      </button>
    </div>
  );
}
