import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { register as registerRequest, lookupInvite } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import Ico from '../components/Ico';
import AuthAside from '../components/AuthAside';

// صفحه‌ی ثبت‌نام مینیمال — فقط شماره تماس + رمز عبور (+ کد دعوت والد، اختیاری).
// نقش با سوییچ بالای کارت انتخاب می‌شود، نه تب جدا.
//
// بقیه‌ی مشخصات (نام، رشته، مؤسسه، انتخاب مشاور/تخصص) بلافاصله بعد از ورود
// داخل پنل با مودال «تکمیل ثبت‌نام» پر می‌شود؛ اینجا فقط دو فیلد داریم تا روی
// موبایل فرم بدون اسکرول و بدون پرشِ چندمرحله‌ای دیده شود.
// والد: نام و ایمیلش خودبخود از فرزندِ کد دعوت ساخته می‌شود و با همان شماره
// وارد پنل والدین می‌شود.

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole = ['STUDENT', 'ADVISOR', 'PARENT'].includes(roleParam) ? roleParam : 'STUDENT';

  // فیلدهای فرم — عمداً کوتاه: فقط شماره + رمز
  const [role, setRole] = useState(initialRole);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // کد دعوت والد — از لینک ?invite=CODE یا تایپ دستی؛ اختیاری (بعداً هم قابل اتصال است)
  const [inviteCode, setInviteCode] = useState((searchParams.get('invite') || '').toUpperCase());

  // لینک دعوت مشاور/دوست (?ref=CODE): دانش‌آموز مستقیم و بدون تأیید به همان مشاور وصل می‌شود
  const refCode = (searchParams.get('ref') || '').trim().toUpperCase();
  const [refInfo, setRefInfo] = useState(null); // اطلاعات دعوت‌کننده
  const [refState, setRefState] = useState(refCode ? 'loading' : 'none'); // none | loading | valid | invalid

  useEffect(() => {
    if (!refCode) return undefined;
    let cancelled = false;
    lookupInvite(refCode)
      .then((info) => {
        if (cancelled) return;
        setRefInfo(info);
        setRefState('valid');
        setRole('STUDENT'); // لینک دعوت فقط برای دانش‌آموز است
      })
      .catch(() => {
        if (!cancelled) setRefState('invalid');
      });
    return () => { cancelled = true; };
  }, [refCode]);
  const usingRef = refState === 'valid';

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // اعتبارسنجی سمت کلاینت — همان قواعد سرور تا خطای شبکه کمتر شود
  function validate() {
    if (!phone.trim()) return 'شماره تماس الزامی است';
    if (password.length < 8) return 'رمز عبور باید حداقل ۸ کاراکتر باشد';
    if (!/[A-Za-z\u0600-\u06FF]/.test(password)) return 'رمز عبور باید شامل یک حرف باشد';
    if (!/\d/.test(password)) return 'رمز عبور باید شامل یک عدد باشد';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // ثبت‌نام مینیمال: فقط شماره + رمز + نقش (والد: کد دعوت اختیاری)
      const payload = { phone: phone.trim(), password, role };
      if (role === 'PARENT' && inviteCode.trim()) {
        payload.parentInviteCode = inviteCode.trim().toUpperCase();
      }
      if (usingRef && role === 'STUDENT') {
        payload.inviteCode = refCode;
      }

      const data = await registerRequest(payload);

      if (data.user) {
        // registrationComplete: false یعنی مودال «تکمیل ثبت‌نام» در پنل باز شود
        login({
          ...data,
          user: { ...data.user, registrationComplete: data.registrationComplete === true },
        });
        if (role === 'STUDENT') {
          navigate('/student', { replace: true });
        } else if (role === 'PARENT') {
          navigate('/parent', { replace: true });
        } else {
          navigate('/advisor', { replace: true });
        }
      } else {
        // ثبت‌نام PENDING (مؤسسه/تأیید سوپرادمین) — کاربر لاگین نمی‌شود
        setSuccessMessage(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page auth-min">
      <div className="auth-floats">
        <ThemeToggle />
        <Link to="/" className="auth-back-home">
          <span aria-hidden>←</span> خانه
        </Link>
      </div>

      {/* کارت مینیمال وسط صفحه — دو فیلد، بدون اسکرول روی موبایل */}
      <div className="auth-split auth-split-wide">
        <AuthAside focus={role === 'ADVISOR' ? 2 : role === 'PARENT' ? 0 : 1} />
        <div className="auth-split-form auth-split-form-wide register-min">
        {/* برند بالای کارت */}
        <div className="auth-brand-min">
          <Logo size={40} title="دانش‌آموزینو" />
          <h1>ساخت حساب کاربری</h1>
          <p>
            {role === 'STUDENT'
              ? 'فقط شماره و رمز — بقیه‌ی مشخصات را بعد از ورود در یک قدم کوتاه پر می‌کنی.'
              : role === 'PARENT'
                ? 'فقط شماره و رمز — بقیه‌اش با کد فرزندت خودکار تکمیل می‌شود.'
                : 'فقط شماره و رمز — تخصص و توضیحاتت را بعد از ورود اضافه می‌کنی.'}
          </p>
          {/* بنر لینک دعوت */}
          {refState === 'loading' && (
            <div className="invite-banner" role="status">در حال بررسی لینک دعوت…</div>
          )}
          {usingRef && refInfo && (
            <div className="invite-banner ok" role="status">
              <strong>
                <Ico e="🎓" /> {refInfo.kind === 'FRIEND'
                  ? `${refInfo.inviterName} تو را دعوت کرده`
                  : `${refInfo.advisorName} تو را دعوت کرده`}
              </strong>
              <span>
                با ثبت‌نام، مستقیم به مشاور «{refInfo.advisorName}»
                {refInfo.instituteName ? ` (${refInfo.instituteName})` : ''} وصل می‌شوی؛
                نیازی به تأیید یا انتخاب مشاور نیست.
              </span>
              {refInfo.kind === 'FRIEND' && refInfo.referral && (
                <span className="invite-banner-bonus">
                  <Ico e="🎁" /> بعد از اولین پرداخت شهریه، هر دوی شما بین ۵ تا ۱۵ درصد تخفیف شهریه‌ی ماهانه (به مدت یک سال) می‌گیرید.
                </span>
              )}
            </div>
          )}
          {refState === 'invalid' && (
            <div className="invite-banner bad" role="alert">
              این لینک دعوت معتبر نیست یا غیرفعال شده. می‌توانی عادی ثبت‌نام کنی و مشاورت را بعداً انتخاب کنی؛
              یا از مشاورت لینک تازه بخواه.
            </div>
          )}
          {/* سوییچ نقش — با تغییر نقش فرم پاک نمی‌شود (با لینک دعوت فقط دانش‌آموز) */}
          {!usingRef && (
          <div className="role-switch">
            <button
              type="button"
              className={role === 'STUDENT' ? 'active' : ''}
              onClick={() => { setRole('STUDENT'); setError(''); }}
            >
              <Ico e="🎒" /> دانش‌آموز
            </button>
            <button
              type="button"
              className={role === 'ADVISOR' ? 'active' : ''}
              onClick={() => { setRole('ADVISOR'); setError(''); }}
            >
              <Ico e="🎓" /> مشاور
            </button>
            <button
              type="button"
              className={role === 'PARENT' ? 'active' : ''}
              onClick={() => { setRole('PARENT'); setError(''); }}
            >
              <Ico e="👨‍👩‍👦" /> والد
            </button>
          </div>
          )}
        </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="step-panel">
          <label className="field-label">
            شماره تماس
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثلاً ۰۹۱۲۳۴۵۶۷۸۹"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              required
              autoFocus
            />
            <span className="field-hint">
              {role === 'PARENT'
                ? 'با همین شماره وارد پنل والدین می‌شوی.'
                : 'با همین شماره وارد پنلت می‌شوی و مشاور/مؤسسه با آن با تو در ارتباط است.'}
            </span>
          </label>

          <label className="field-label">
            رمز عبور
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۸ کاراکتر، شامل حرف و عدد"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="نمایش رمز"
              >
                <Ico e={showPassword ? '🙈' : '👁'} />
              </button>
            </div>
          </label>

          {/* والد: کد دعوت فرزند — اختیاری، تنها فیلد اضافه‌ی والد */}
          {role === 'PARENT' && (
            <label className="field-label span-2">
              کد دعوت فرزند <span className="field-optional">(اختیاری)</span>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="مثلاً AB2CD3EF"
                dir="ltr"
                maxLength={8}
              />
              <span className="field-hint">
                فرزندت در «پنل دانش‌آموز» این کد را می‌سازد. با واردکردنش حسابت خودبخود به او وصل می‌شود؛
                بدون کد هم می‌توانی ثبت‌نام کنی و بعداً از پنل والدین اتصال بدهی.
              </span>
            </label>
          )}

          <div className="step-actions span-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'در حال ثبت‌نام…' : <><Ico e="✓" /> ثبت‌نام</>}
            </button>
          </div>

          {error && (
            <div className="alert alert-error span-2">
              <span><Ico e="⚠" /></span> {error}
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success span-2">
              <span><Ico e="✓" /></span> {successMessage}
            </div>
          )}

          {role !== 'PARENT' && (
            <p className="field-hint span-2" style={{ textAlign: 'center' }}>
              <Ico e="✨" /> بعد از ورود، نام و رشته/تخصصت را در یک کارت کوچک تکمیل می‌کنی — کمتر از ۲ دقیقه.
            </p>
          )}
        </div>
      </form>

        <div className="auth-institute-entry">
          <span>مدیر آموزشگاه یا مدرسه هستید؟</span>{' '}
          <Link to="/register/institute">
            درخواست ثبت آموزشگاه <span aria-hidden="true">←</span>
          </Link>
        </div>

        <div className="auth-min-footer">
          از قبل حساب داری؟ <Link to="/login">وارد شو</Link>
        </div>
      </div>
    </div>
      </div>
  );
}
