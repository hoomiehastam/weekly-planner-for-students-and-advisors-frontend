import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerInstitute } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import Ico from '../components/Ico';
import AuthAside from '../components/AuthAside';

export default function RegisterInstitutePage() {
  const [instituteName, setInstituteName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    if (!instituteName.trim() || instituteName.trim().length < 2) {
      return 'نام آموزشگاه یا مدرسه باید حداقل ۲ کاراکتر باشد';
    }
    if (!managerName.trim() || managerName.trim().length < 2) {
      return 'نام و نام خانوادگی مدیر باید حداقل ۲ کاراکتر باشد';
    }
    if (!phone.trim()) {
      return 'شماره همراه مدیر الزامی است';
    }
    if (password.length < 8) {
      return 'رمز عبور باید حداقل ۸ کاراکتر باشد';
    }
    if (!/[A-Za-z\u0600-\u06FF]/.test(password)) {
      return 'رمز عبور باید شامل حداقل یک حرف باشد';
    }
    if (!/\d/.test(password)) {
      return 'رمز عبور باید شامل حداقل یک عدد باشد';
    }
    if (password !== confirmPassword) {
      return 'رمز عبور و تکرار آن یکسان نیستند';
    }
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const vErr = validate();
    if (vErr) {
      setError(vErr);
      return;
    }

    setLoading(true);
    try {
      await registerInstitute({
        instituteName: instituteName.trim(),
        managerName: managerName.trim(),
        phone: phone.trim(),
        password,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'خطا در ثبت درخواست');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page auth-min">
      <div className="auth-floats">
        <ThemeToggle />
        <Link to="/register" className="auth-back-home">
          <span aria-hidden>←</span> ثبت‌نام کاربران
        </Link>
      </div>

      <div className="auth-split auth-split-wide">
        <AuthAside focus={2} />

        <div className="auth-split-form auth-split-form-wide register-min">
          <div className="auth-brand-min">
            <Logo size={42} title="دانش‌آموزینو" />
            <h1>درخواست ثبت آموزشگاه و مؤسسه</h1>
            <p>
              پنل یکپارچه‌ی مدیریت آموزشگاه جهت نظارت بر مشاوران، دانش‌آموزان و برنامه‌ریزی تحصیلی
            </p>
          </div>

          {submitted ? (
            <div className="institute-reg-success" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--green-600, #16a34a)',
                  fontSize: 32,
                }}
              >
                <i className="ti ti-check" aria-hidden="true" />
              </div>

              <h2 style={{ fontSize: 20, marginBottom: 10, color: 'var(--ink)' }}>
                درخواست «{instituteName}» با موفقیت ثبت شد
              </h2>

              <p className="muted-text" style={{ lineHeight: 1.8, marginBottom: 24, fontSize: 14 }}>
                اطلاعات مؤسسه و مشخصات شما به عنوان مدیر آموزشگاه دریافت شد. پس از بررسی و تأیید نهایی توسط مدیریت سامانه، پیامک فعال‌سازی ارسال خواهد شد و می‌توانید با همین شماره همراه و رمز عبور وارد پنل آموزشگاه شوید.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/login" className="btn-primary">
                  <Ico e="🔑" /> رفتن به صفحه‌ی ورود
                </Link>
                <Link to="/" className="btn-secondary">
                  صفحه‌ی اصلی سایت
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="step-panel two-col">
                <label className="field-label span-2">
                  نام آموزشگاه / مؤسسه
                  <input
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    placeholder="مثلاً آموزشگاه کنکور هدف، دبیرستان البرز"
                    required
                    autoFocus
                  />
                </label>

                <label className="field-label">
                  نام و نام خانوادگی مدیر
                  <input
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="نام کامل مسئول یا مدیر مؤسسه"
                    required
                  />
                </label>

                <label className="field-label">
                  شماره همراه مدیر
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    inputMode="tel"
                    required
                  />
                  <span className="field-hint">نام کاربری شما برای ورود به پنل خواهد بود.</span>
                </label>

                <label className="field-label">
                  رمز عبور ورود
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="حداقل ۸ کاراکتر (حرف و عدد)"
                      dir="ltr"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
                    >
                      <i className={`ti ti-${showPassword ? 'eye-off' : 'eye'}`} aria-hidden="true" />
                    </button>
                  </div>
                </label>

                <label className="field-label">
                  تکرار رمز عبور
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تکرار همان رمز عبور"
                    dir="ltr"
                    required
                  />
                </label>

                {error && (
                  <div className="alert alert-error span-2">
                    <span><Ico e="⚠" /></span> {error}
                  </div>
                )}

                <div className="step-actions span-2" style={{ marginTop: 8 }}>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'در حال ثبت اطلاعات…' : <><i className="ti ti-building" aria-hidden="true" /> ثبت درخواست آموزشگاه</>}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="auth-min-footer">
            از قبل حساب داری؟ <Link to="/login">ورود به حساب</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

