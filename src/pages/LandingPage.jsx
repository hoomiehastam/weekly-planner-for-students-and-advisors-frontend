import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { toFaDigits } from '../utils/jalali';
import { useAuth } from '../context/AuthContext';
import { MASTER_BRAND, BRANDS } from '../utils/brand';

// صفحه‌ی عمومی (لندینگ) — روایت «یک هفته با آوا»:
// به‌جای فهرست ویژگی‌های تکراری، بازدیدکننده سفر واقعی یک دانش‌آموز را در طول
// یک هفته می‌بیند (دریافت برنامه ← انجام ← ثبت ← بازخورد مشاور) و خودش را
// جای او می‌گذارد. دو دروازه‌ی ورود (دانش‌آموز/مشاور) همیشه در دسترس‌اند.
export default function LandingPage() {
  const { auth } = useAuth();
  // دکمه‌ی بازگشت به بالا — بعد از عبور از hero ظاهر می‌شود
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // کاربر لاگین‌شده مستقیماً به پنل خودش هدایت می‌شود
  const dashboardPath = auth?.user?.role === 'STUDENT' ? '/student' : '/advisor';

  return (
    <div className="landing-page">
      {/* ---------- هدر ---------- */}
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <div className="brand">
            <Logo size={40} title="دانش‌آموزینو" />
            <h2>{MASTER_BRAND}</h2>
          </div>
          <nav className="landing-nav-links" aria-label="ناوبری صفحه">
            <a href="#week">هفته‌ی آوا</a>
            <a href="#students">برای دانش‌آموز</a>
            <a href="#advisors">برای مشاور</a>
          </nav>
          <div className="landing-nav-actions">
            <ThemeToggle />
            {auth ? (
              <Link to={dashboardPath} className="btn-primary landing-cta-sm">
                ورود به پنل
              </Link>
            ) : (
              <Link to="/login" className="landing-login-btn">
                ورود
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero: جمله‌ی صادقانه + دو دروازه ---------- */}
        <section className="landing-hero">
          <div className="landing-container">
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="landing-kicker">
                  <span className="landing-kicker-dot" aria-hidden />
                  مشاور داری؟ برنامه‌ات اینجا می‌رسد. مشاور نیستی؟ اینجا مشاور پیدا کن.
                </span>
                <h1 className="landing-title">
                  برنامه‌ات را <em>هفته‌ای یک‌بار</em> می‌گیری؛
                  بقیه‌ی هفته فقط اجرا و ثبت است.
                </h1>
                <p className="landing-subtitle">
                  دانش‌آموزینو برنامه‌ی هفتگی مشاورت را جلوی چشم تو نگه می‌دارد،
                  هر دقیقه مطالعه و هر تست را با یک تیک ثبت می‌کند و آخر هفته
                  به‌جای حدس و گمان، عدد واقعی به تو و مشاورت نشان می‌دهد.
                </p>
                <div className="hero-proof">
                  <div className="proof-item">
                    <strong>۰ پیام</strong>
                    <small>دیگر «امروز چند ساعت خوندی؟» در واتساپ نمی‌آید؛ آمار خودش اینجا ست.</small>
                  </div>
                  <div className="proof-item">
                    <strong>۱ نگاه</strong>
                    <small>برنامه‌ی امروز با ساعت شروع و پایان، قبل از هر چیز دیگر دیده می‌شود.</small>
                  </div>
                  <div className="proof-item">
                    <strong>۲ تیک</strong>
                    <small>همین قدر طول می‌کشد پایان هر بازه را ثبت کنی و آمارت به‌روز شود.</small>
                  </div>
                </div>
              </div>

              {/* دو دروازه‌ی ورود — قلب Hero */}
              <div className="hero-gates">
                <Link
                  to={auth ? dashboardPath : '/register?role=STUDENT'}
                  className="gate gate-student"
                >
                  <span className="gate-head">
                    <span className="gate-mark"><Logo size={30} /></span>
                    <span className="gate-title">{BRANDS.STUDENT.name}</span>
                  </span>
                  <span className="gate-desc">
                    مشاوری که برایت برنامه می‌سازد، از همین‌جا به تو وصل می‌شود.
                  </span>
                  <span className="gate-points">
                    <span>برنامه‌ی هفتگی با ساعت دقیق هر درس</span>
                    <span>ثبت دقیقه و تست با دو تیک</span>
                    <span>آزمون واقعی با تایمر و نمره</span>
                  </span>
                  <span className="gate-cta student">
                    {auth ? 'ورود به پنل دانش‌آموزی' : 'شروع به‌عنوان دانش‌آموز'}
                    <span className="cta-arrow" aria-hidden>←</span>
                  </span>
                </Link>

                <Link
                  to={auth ? dashboardPath : '/register?role=ADVISOR'}
                  className="gate gate-advisor"
                >
                  <span className="gate-head">
                    <span className="gate-mark gate-mark-advisor">م</span>
                    <span className="gate-title">{BRANDS.ADVISOR.name}</span>
                  </span>
                  <span className="gate-desc">
                    به‌جای ۳۰ چت واتساپ، یک پنل که همه‌ی شاگردهایت را با آمارشان نشان می‌دهد.
                  </span>
                  <span className="gate-points">
                    <span>ساخت برنامه و آزمون برای کل کلاس</span>
                    <span>دیدن لحظه‌ای پیشرفت هر شاگرد</span>
                    <span>یادآور مستقیم داخل داشبورد او</span>
                  </span>
                  <span className="gate-cta advisor">
                    {auth ? 'ورود به پنل مشاور' : 'شروع به‌عنوان مشاور'}
                    <span className="cta-arrow" aria-hidden>←</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- هفته‌ی آوا: تایم‌لاین روایی ---------- */}
        <section id="week" className="landing-section">
          <div className="landing-container">
            <h2 className="landing-section-title">
              یک هفته با <em>آوا</em> — دانش‌آموز واقعیِ همین پنل
            </h2>
            <p className="landing-section-sub">
              این روایت دقیقاً همان چرخه‌ای است که هر دانش‌آموز اینجا طی می‌کند؛
              اسکرول کن تا هفته‌ی آوا را ببینی.
            </p>

            <div className="week-timeline">
              <div className="timeline-rail" aria-hidden />

              {/* شنبه — برنامه می‌رسد */}
              <div className="timeline-item">
                <span className="timeline-day">شنبه</span>
                <div className="timeline-card">
                  <div className="timeline-head">
                    <span className="timeline-emoji" aria-hidden>📥</span>
                    <div>
                      <h3>برنامه‌ی جدید از مشاور رسید</h3>
                      <p>
                        مشاور آوا برنامه‌ی هفته را ساخت و در پنل او منتشر شد.
                        آوا با نشان «به‌روزرسانی جدید» هم‌زمان با ورود، آن را می‌بیند —
                        هیچ پیام جداگانه‌ای لازم نیست.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-plan">
                    <div className="plan-row"><span className="plan-time">۱۶:۰۰–۱۷:۳۰</span><span>ریاضی — انتگرال، حل تمرین</span><span className="plan-tag tag-indigo">تمرین</span></div>
                    <div className="plan-row"><span className="plan-time">۱۸:۰۰–۱۸:۴۵</span><span>ادبیات — مرور قلمرو فکر</span><span className="plan-tag tag-sage">مرور</span></div>
                    <div className="plan-row"><span className="plan-time">۱۹:۳۰–۲۰:۳۰</span><span>شیمی — تست فصل ۱</span><span className="plan-tag tag-amber">تست</span></div>
                  </div>
                </div>
              </div>

              {/* یکشنبه — اجرا و ثبت */}
              <div className="timeline-item">
                <span className="timeline-day">یکشنبه</span>
                <div className="timeline-card">
                  <div className="timeline-head">
                    <span className="timeline-emoji" aria-hidden>✅</span>
                    <div>
                      <h3>اجرا کن، تیک بزن، تمام</h3>
                      <p>
                        پایان هر بازه، آوا فقط دو کار می‌کند: تیک «انجام شد» و ثبت
                        تعداد تست. هر چیز دیگر لازم نیست؛ همین تیک‌ها بعداً آمارش را می‌سازند.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-stats">
                    <div className="stat-mini"><strong>{toFaDigits(105)}</strong><small>دقیقه مطالعه‌ی امروز</small></div>
                    <div className="stat-mini"><strong>{toFaDigits(24)}</strong><small>تست زده‌شده</small></div>
                    <div className="stat-mini stat-mini-done"><strong>{toFaDigits(3)}</strong><small>بازه‌ی کامل‌شده</small></div>
                  </div>
                </div>
              </div>

              {/* چهارشنبه — آزمون */}
              <div className="timeline-item">
                <span className="timeline-day">چهارشنبه</span>
                <div className="timeline-card timeline-card-accent">
                  <div className="timeline-head">
                    <span className="timeline-emoji" aria-hidden>⏱</span>
                    <div>
                      <h3>آزمون زمان‌دار، مثل روز آزمون</h3>
                      <p>
                        مشاور یک آزمون ۲۰سؤالی فعال کرده. آوا با شمارش معکوس و
                        بدون برگشت به جزوه می‌زند؛ تستی‌ها همان لحظه نمره می‌گیرند.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-exam">
                    <span className="exam-clock">{toFaDigits('14:32')}</span>
                    <div className="exam-bars">
                      <div className="exam-bar-row"><span>پاسخ‌داده</span><div className="exam-bar"><span style={{ width: '60%' }} /></div><strong>{toFaDigits(12)}</strong></div>
                      <div className="exam-bar-row"><span>بی‌پاسخ</span><div className="exam-bar"><span style={{ width: '25%' }} /></div><strong>{toFaDigits(5)}</strong></div>
                      <div className="exam-bar-row"><span>مانده</span><div className="exam-bar"><span style={{ width: '15%' }} /></div><strong>{toFaDigits(3)}</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* جمعه — گزارش و بازخورد */}
              <div className="timeline-item">
                <span className="timeline-day">جمعه</span>
                <div className="timeline-card">
                  <div className="timeline-head">
                    <span className="timeline-emoji" aria-hidden>📊</span>
                    <div>
                      <h3>آخر هفته: عدد واقعی، نه حس‌وحال</h3>
                      <p>
                        آوا ۹ ساعت و ۲۰ دقیقه مطالعه و ۲۱۰ تست ثبت کرده. مشاور بدون
                        هیچ سؤالی همین را در پنل خودش می‌بیند و برنامه‌ی هفته‌ی بعد را
                        دقیق‌تر می‌سازد. چرخه از نو.
                      </p>
                    </div>
                  </div>
                  <div className="timeline-week-report">
                    <div className="report-bar-col">
                      <div className="report-bar" style={{ '--h': '55%' }} />
                      <small>شنبه</small>
                    </div>
                    <div className="report-bar-col">
                      <div className="report-bar" style={{ '--h': '80%' }} />
                      <small>یکشنبه</small>
                    </div>
                    <div className="report-bar-col">
                      <div className="report-bar" style={{ '--h': '40%' }} />
                      <small>دوشنبه</small>
                    </div>
                    <div className="report-bar-col">
                      <div className="report-bar" style={{ '--h': '95%' }} />
                      <small>چهارشنبه</small>
                    </div>
                    <div className="report-bar-col">
                      <div className="report-bar" style={{ '--h': '65%' }} />
                      <small>پنجشنبه</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- برای دانش‌آموز: برتری‌ها به زبان نتیجه ---------- */}
        <section id="students" className="landing-section landing-section-tinted">
          <div className="landing-container">
            <h2 className="landing-section-title">
              برای دانش‌آموز: <em>چرا اینجا؟</em>
            </h2>
            <p className="landing-section-sub">
              هر بخش از پنل برای یک جواب مشخص ساخته شده است.
            </p>
            <div className="landing-feature-grid">
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-indigo" aria-hidden>🗓</span>
                <h3>هیچ‌وقت نمی‌پرسی «امروز چی بخونم؟»</h3>
                <p>برنامه‌ی هفته با ساعت شروع و پایان هر بازه، صفحه‌ی اول پنلت است — نه فایلی وسط واتساپ.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-amber" aria-hidden>⚡</span>
                <h3>ثبت پیشرفت ۵ ثانیه‌ای</h3>
                <p>یک تیک برای «انجام شد»، یک عدد برای تست. کاغذ و دفتر ثبت لازم نیست.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-teal" aria-hidden>📊</span>
                <h3>آماری که دروغ نمی‌گوید</h3>
                <p>سهم واقعی هر درس از وقتت را می‌بینی؛ هفته‌ی بعد برنامه بر اساس همین عددها عوض می‌شود.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-pink" aria-hidden>📝</span>
                <h3>آزمون بدون برگه و تصحیح</h3>
                <p>همین‌جا با تایمر می‌زنی، تستی‌ها خودکار نمره می‌گیرند و پاسخ‌برگ تشریحی هم مرتب جلوی مشاورت است.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- برای مشاور ---------- */}
        <section id="advisors" className="landing-section">
          <div className="landing-container">
            <h2 className="landing-section-title">
              برای مشاور: <em>کلاس بزرگ‌تر، کاغذ صفر</em>
            </h2>
            <p className="landing-section-sub">
              هر شاگردِ بیشتر بدون پنل یعنی پیامِ بیشتر؛ اینجا هر دو با هم جلو نمی‌روند.
            </p>
            <div className="landing-feature-grid">
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-indigo" aria-hidden>👥</span>
                <h3>۳۰ شاگرد مثل ۳ شاگرد</h3>
                <p>آمار هفتگی همه در یک صفحه؛ ضعیف‌ترین و قوی‌ترین شاگرد هفته را بدون چک‌کردن تک‌تک چت‌ها می‌بینی.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-amber" aria-hidden>✨</span>
                <h3>یک آزمون برای همه، هرکدام نسخه‌ی خودشان</h3>
                <p>آزمون گروهی بساز؛ هر شاگرد تایمر و پاسخ‌برگ مستقل خودش را می‌گیرد و تستی‌ها برایت نمره می‌شوند.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-teal" aria-hidden>🔔</span>
                <h3>یادآور همان‌جایی که می‌بینند</h3>
                <p>یادآوری که می‌فرستی، مستقیم در داشبورد شاگرد می‌نشیند — نه گم‌شده وسط پیام‌های گوشی.</p>
              </div>
              <div className="landing-feature-card">
                <span className="landing-feature-icon landing-ico-pink" aria-hidden>✅</span>
                <h3>نمره‌دهی مرتب و سریع</h3>
                <p>تشریحی‌ها با پاسخ‌برگ کنار هم؛ نوبتی نمره بده و تمام — بدون فایل و پرینت پراکنده.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- شروع: دو مسیر، هر دو کوتاه ---------- */}
        <section className="landing-final-cta">
          <div className="landing-container">
            <h2>هفته‌ی بعدت از همین‌جا شروع می‌شود.</h2>
            <p>ثبت‌نام دانش‌آموزی کمتر از یک دقیقه است؛ مشاورها بعد از تأیید فعال می‌شوند.</p>
            <div className="landing-hero-actions landing-hero-actions-center">
              <Link to="/register?role=STUDENT" className="cta-button">
                شروع به‌عنوان دانش‌آموز
                <span className="cta-arrow" aria-hidden>←</span>
              </Link>
              <Link to="/register?role=ADVISOR" className="btn-secondary landing-btn-lg">
                شروع به‌عنوان مشاور
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- فوتر ---------- */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-row">
          <div className="brand landing-footer-brand">
            <Logo size={34} />
            <span>{MASTER_BRAND} · دانش‌آموزینو و مشاور دانش‌آموزینو</span>
          </div>
          <p className="landing-footer-copy">
            ساخته‌شده برای دانش‌آموزان و مشاوران کنکور · {toFaDigits(1405)}
          </p>
        </div>
      </footer>

      {/* بازگشت به بالا — بعد از اسکرول ظاهر می‌شود */}
      <button
        type="button"
        className={`back-to-top ${showTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="بازگشت به بالای صفحه"
        title="بازگشت به بالا"
      >
        ↑
      </button>
    </div>
  );
}
