import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { changeMyPassword } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ThemeToggle';

// صفحه‌ی تغییر رمز عبور اجباری — وقتی کاربر با OTP وارد شده، باید رمز جدید تعیین کند.
// در این حالت currentPassword لازم نیست چون هویت کاربر با OTP تأیید شده.
//
// اگر کاربر از حالت عادی (نه OTP) وارد شده و می‌خواهد داوطلبانه رمزش را عوض کند،
// می‌تواند از این صفحه با وارد کردن currentPassword استفاده کند.
export default function ChangePasswordPage() {
  const { auth, clearMustChangePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // اگر کاربر با OTP وارد شده، حالت «اجباری» است و currentPassword لازم نیست
  const isForced = auth?.mustChangePassword === true;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('رمز عبور جدید و تکرارش یکسان نیستند');
      return;
    }
    if (newPassword.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }

    setLoading(true);
    try {
      const payload = { newPassword };
      // در حالت داوطلبانه، currentPassword هم لازم است
      if (!isForced && currentPassword) {
        payload.currentPassword = currentPassword;
      }

      const data = await changeMyPassword(payload);
      toast.success(data.message || 'رمز عبور با موفقیت تغییر کرد');

      // پاک‌کردن پرچم mustChangePassword در context
      clearMustChangePassword();

      // هدایت به داشبورد مناسب بر اساس نقش
      const role = auth?.user?.role;
      if (role === 'STUDENT') navigate('/student', { replace: true });
      else if (role === 'INSTITUTE_MANAGER') navigate('/institute', { replace: true });
      else if (role === 'PARENT') navigate('/parent', { replace: true });
      else navigate('/advisor', { replace: true });
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
      {!isForced && (
        <Link to="/" className="auth-back-home" title="بازگشت به صفحه‌ی اصلی">
          <span aria-hidden>←</span> خانه
        </Link>
      )}
      <div className="auth-shell" style={{ gridTemplateColumns: '1fr', maxWidth: '460px' }}>
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-head">
            <h1>{isForced ? '🔑 تعیین رمز عبور جدید' : 'تغییر رمز عبور'}</h1>
            <p className="muted-text">
              {isForced
                ? 'شما با رمز یک‌بار مصرف وارد شده‌اید. برای ادامه، یک رمز عبور جدید تعیین کنید.'
                : 'برای تغییر رمز عبور، رمز فعلی و رمز جدید را وارد کنید.'}
            </p>
          </div>

          {isForced && (
            <div className="alert alert-info">
              <span>ℹ️</span>
              <div>
                <strong>توجه:</strong> رمز قبلی شما توسط سوپرادمین بازنشانی شده و دیگر کار نمی‌کند.
                لطفاً یک رمز جدید تعیین کنید تا بتوانید دوباره وارد شوید.
              </div>
            </div>
          )}

          {!isForced && (
            <label className="field-label">
              رمز عبور فعلی
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="رمز فعلی خود را وارد کنید"
                  required
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
          )}

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
                autoFocus={isForced}
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
            <span className="field-hint">
              رمز باید حداقل ۸ کاراکتر باشد و شامل حرف و عدد باشد.
            </span>
          </label>

          <label className="field-label">
            تکرار رمز عبور جدید
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="رمز جدید را دوباره وارد کنید"
              required
              minLength={8}
            />
          </label>

          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'در حال ذخیره…' : '✓ ذخیره‌ی رمز جدید'}
          </button>

          {!isForced && (
            <p className="muted-text mobile-cta">
              <Link to="/login" className="inline-cta">انصراف</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
