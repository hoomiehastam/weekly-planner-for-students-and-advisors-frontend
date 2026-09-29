import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginRequest, requestPasswordReset, requestOtpCode } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';

// صفحه‌ی ورود — اکنون سه حالت دارد:
//   1) ورود با ایمیل و رمز عبور (حالت پیش‌فرض)
//   2) بازیابی رمز عبور — کاربر ایمیل را وارد می‌کند و لینک بازنشانی به او ایمیل می‌شود
//   3) ورود با کد یک‌بارمصرف ایمیلی — کد ۶ رقمی به ایمیل می‌آید و جای رمز عبور می‌نشیند
// نکته‌ی مهم: ایمیل، کلید بازیابی رمز عبور است؛ این هشدار زیر فیلد ایمیل یادآوری می‌شود.
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false); // آیا کد برای این ایمیل فرستاده شده؟
  const [devOtp, setDevOtp] = useState(''); // در حالت توسعه (بدون SMTP) کد در پاسخ می‌آید
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  // حالت فرم: 'login' (پیش‌فرض) یا 'forgot' (بازیابی رمز عبور) یا 'otp' (ورود با کد ایمیلی)
  const [mode, setMode] = useState('login');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        // درخواست بازنشانی رمز عبور — لینک به ایمیل کاربر ارسال می‌شود
        await requestPasswordReset(email);
        setInfo('اگر این ایمیل در سیستم ثبت باشد، لینک بازیابی رمز عبور به آن ارسال شد. صندوق ورودی (و پوشه‌ی اسپم) را بررسی کنید.');
        setMode('login');
      } else if (mode === 'otp' && !otpSent) {
        // مرحله‌ی اول ورود با کد: درخواست ارسال کد به ایمیل
        const data = await requestOtpCode(email);
        setOtpSent(true);
        setDevOtp(data.devOtp || '');
        setInfo('اگر این ایمیل در سیستم ثبت باشد، کد ورود یک‌بارمصرف به آن ارسال شد. کد تا ۱۰ دقیقه معتبر است.');
      } else if (mode === 'otp' && otpSent) {
        // مرحله‌ی دوم: ورود با ایمیل + کد (کد سمت سرور جای رمز عبور بررسی می‌شود)
        const data = await loginRequest(email, otpCode.trim().toUpperCase());
        login(data);

        if (data.user?.mustChangePassword) {
          navigate('/change-password', { replace: true });
          return;
        }

        if (data.user.role === 'STUDENT') navigate('/student');
        else if (data.user.role === 'INSTITUTE_MANAGER') navigate('/institute');
        else if (data.user.role === 'PARENT') navigate('/parent');
        else navigate('/advisor');
      } else {
        const data = await loginRequest(email, password);
        login(data);

        // اگر کاربر با OTP وارد شده و mustChangePassword=true باشد،
        // به صفحه‌ی تغییر رمز اجباری هدایت می‌شود — نه به داشبورد.
        if (data.user?.mustChangePassword) {
          navigate('/change-password', { replace: true });
          return;
        }

        if (data.user.role === 'STUDENT') navigate('/student');
        else if (data.user.role === 'INSTITUTE_MANAGER') navigate('/institute');
        else if (data.user.role === 'PARENT') navigate('/parent');
        else navigate('/advisor');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setInfo('');
    setOtpSent(false);
    setOtpCode('');
    setDevOtp('');
  }

  return (
    <div className="auth-page auth-min">
      <div className="auth-floats">
        <ThemeToggle />
        <Link to="/" className="auth-back-home">
          <span aria-hidden>←</span> خانه
        </Link>
      </div>

      {/* چیدمان دورسته‌ای: پنل معرفی سرمه‌ای + کارت فرم — مطابق کانسپت login_register */}
      <div className="auth-split">
        <aside className="auth-split-aside">
          <div className="asa-brand">
            <span className="asa-mark" aria-hidden>د</span>
            <span>دانش‌آموزینو</span>
          </div>
          <div className="asa-lead">
            <p className="asa-title">
              هر روز، یک قدم
              <br />
              نزدیک‌تر به هدف
            </p>
            <p className="asa-sub">
              بیش از هزار داوطلب کنکور همین حالا برنامه‌شان را اینجا دنبال می‌کنند.
            </p>
          </div>
          <div className="asa-dots" aria-hidden>
            <span className="on" />
            <span />
            <span />
          </div>
        </aside>

        <div className="auth-split-form">
          <div className="auth-brand-min">
            <Logo size={40} title="دانش‌آموزینو" />
            <h1>
              {mode === 'forgot'
                ? 'بازیابی رمز عبور'
                : mode === 'otp'
                  ? 'ورود با کد یک‌بارمصرف'
                  : 'خوش برگشتی'}
            </h1>
            <p>
              {mode === 'forgot'
                ? 'ایمیلت را وارد کن تا لینک بازنشانی رمز عبور برایت ارسال شود.'
                : mode === 'otp'
                  ? otpSent
                    ? 'کد ۶ رقمی ارسال‌شده به ایمیلت را وارد کن.'
                    : 'ایمیلت را وارد کن تا کد ورود یک‌بارمصرف برایت ارسال شود.'
                  : 'برنامه‌ی همین هفته‌ات داخل پنل منتظرت است.'}
            </p>
          </div>

        <form onSubmit={handleSubmit}>

          <label className="field-label">
            ایمیل
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              dir="ltr"
            />
          </label>

          {mode === 'login' && (
            <label className="field-label">
              رمز عبور
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="نمایش رمز"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => switchMode('forgot')}
              >
                رمز عبورت را فراموش کرده‌ای؟
              </button>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => switchMode('otp')}
              >
                ورود با کد یک‌بارمصرف ایمیلی
              </button>
            </label>
          )}

          {mode === 'otp' && otpSent && (
            <label className="field-label">
              کد یک‌بارمصرف
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="------"
                required
                dir="ltr"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={10}
                className="otp-input"
              />
              <span className="field-hint">
                💡 کد تا ۱۰ دقیقه معتبر است و فقط یک‌بار قابل استفاده است. سراغ پوشه‌ی اسپم هم سر بزن.
              </span>
              {devOtp && (
                <div className="alert alert-info" style={{ marginTop: 8 }}>
                  <span>🛠</span>
                  <div>
                    حالت توسعه (بدون SMTP) — کد ارسال‌شده: <strong dir="ltr">{devOtp}</strong>
                  </div>
                </div>
              )}
            </label>
          )}

          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
            </div>
          )}
          {info && (
            <div className="alert alert-success">
              <span>✓</span> {info}
            </div>
          )}

          <div className="auth-form-actions">
            {mode !== 'login' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => switchMode('login')}
              >
                بازگشت به ورود
              </button>
            )}
            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading
                ? (mode === 'login' ? 'در حال ورود…' : 'در حال ارسال…')
                : mode === 'forgot'
                  ? 'ارسال لینک بازیابی'
                  : mode === 'otp'
                    ? (otpSent ? 'ورود با کد' : 'ارسال کد یک‌بارمصرف')
                    : 'ورود'}
            </button>
            {mode === 'otp' && otpSent && (
              <button
                type="button"
                className="btn-secondary btn-block"
                disabled={loading}
                onClick={async () => {
                  setError('');
                  setInfo('');
                  setLoading(true);
                  try {
                    const data = await requestOtpCode(email);
                    setDevOtp(data.devOtp || '');
                    setInfo('کد جدید ارسال شد. صندوق ورودی (و پوشه‌ی اسپم) را بررسی کنید.');
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                📩 ارسال دوباره‌ی کد
              </button>
            )}
          </div>

        </form>

        <div className="auth-min-footer">
          حساب نداری؟
          <Link to="/register?role=STUDENT">ثبت‌نام دانش‌آموز</Link>
          <Link to="/register?role=ADVISOR">ثبت‌نام مشاور</Link>
        </div>
        </div>
      </div>
    </div>
  );
}
