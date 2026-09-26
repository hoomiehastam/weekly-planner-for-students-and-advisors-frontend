import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { verifyResetToken, resetPassword } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';

// صفحه‌ی بازنشانی رمز عبور — کاربر با کلیک روی لینک ایمیلش به اینجا می‌آید.
// توکن از query string خوانده می‌شود؛ اگر معتبر باشد، فرمِ رمز جدید نمایش داده می‌شود.
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [tokenValid, setTokenValid] = useState(null); // null=در حال بررسی، true/false
  // نبودِ توکن در URL معادل «توکن نامعتبر» است — به‌جای setState در effect،
  // اینجا مشتق می‌شود (الگوی توصیه‌شده‌ی react-hooks/set-state-in-effect)
  const effectiveValid = token ? tokenValid : false;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // بررسی اعتبار توکن هنگام mount یا تغییر آن
  useEffect(() => {
    if (!token) return; // نبود توکن قبلاً در effectiveValid=false منعکس شده
    let cancelled = false;
    verifyResetToken(token)
      .then((data) => {
        if (!cancelled) setTokenValid(data.valid);
      })
      .catch(() => {
        if (!cancelled) setTokenValid(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('رمز عبور و تکرارش یکسان نیستند');
      return;
    }
    if (newPassword.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(token, newPassword);
      setSuccess(data.message || 'رمز عبور با موفقیت تغییر کرد.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <Link to="/" className="auth-back-home" title="بازگشت به صفحه‌ی اصلی">
        <span aria-hidden>←</span> خانه
      </Link>
      <div className="auth-shell" style={{ gridTemplateColumns: '1fr', maxWidth: '460px' }}>
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-head">
            <h1>بازنشانی رمز عبور</h1>
            <p className="muted-text">
              رمز عبور جدید خود را وارد کن.
            </p>
          </div>

          {effectiveValid === null && (
            <div className="alert alert-info">
              <span>⏳</span> در حال بررسی توکن…
            </div>
          )}

          {effectiveValid === false && (
            <>
              <div className="alert alert-error">
                <span>⚠</span> توکن نامعتبر یا منقضی است. لطفاً دوباره درخواست بازیابی بده.
              </div>
              <Link to="/login" className="btn-primary btn-block auth-btn-link">
                بازگشت به ورود
              </Link>
            </>
          )}

          {effectiveValid === true && (
            <>
              <label className="field-label">
                رمز عبور جدید
                <div className="password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۸ کاراکتر، شامل حرف و عدد"
                    required
                    minLength={8}
                    autoFocus
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
              </label>

              <label className="field-label">
                تکرار رمز عبور
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="رمز عبور را دوباره وارد کن"
                  required
                  minLength={8}
                />
              </label>

              {error && (
                <div className="alert alert-error">
                  <span>⚠</span> {error}
                </div>
              )}
              {success && (
                <div className="alert alert-success">
                  <span>✓</span> {success}
                </div>
              )}

              {/* ردیف دکمه‌ها: بازگشت (ثانویه) + ذخیره (اصلی) — هم‌تراز و هم‌عرض در همه‌ی حالت‌ها */}
              <div className="auth-form-actions">
                <Link to="/login" className="btn-secondary auth-btn-link">
                  بازگشت به ورود
                </Link>
                <button type="submit" className="btn-primary" disabled={loading || !!success}>
                  {loading ? 'در حال ذخیره…' : '✓ ذخیره‌ی رمز جدید'}
                </button>
              </div>
            </>
          )}

          {effectiveValid === null && (
            <div className="auth-form-actions">
              <Link to="/login" className="btn-secondary auth-btn-link">
                بازگشت به ورود
              </Link>
            </div>
          )}

          {/* توجه: mobile-cta اینجا لازم نیست — در هر سه حالت دکمه‌ی «بازگشت به ورود» وجود دارد */}
        </form>
      </div>
    </div>
  );
}
