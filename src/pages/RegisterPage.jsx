import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  register as registerRequest,
  fetchActiveAdvisors,
  fetchPublicInstitutes,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toFaDigits } from '../utils/jalali';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';

// صفحه‌ی ثبت‌نام — سه‌مرحله‌ای (نقش با سوییچ بالای کارت انتخاب می‌شود، نه تب جدا):
//   مرحله ۱: اطلاعات حساب + رشته‌ی تحصیلی/تخصص
//   مرحله ۲: آموزشگاه (مستقل یا عضویت)
//   مرحله ۳: تماس و توضیحات + انتخاب مشاور (فقط دانش‌آموز)
//
// نکته‌ی مهم: وقتی دانش‌آموز ثبت‌نام می‌کند، link با مشاور با status=PENDING ساخته می‌شود.
// مشاور در پنلش درخواست را می‌بیند و تصمیم می‌گیرد. تا تأیید، دانش‌آموز به برنامه‌ی هفتگی دسترسی ندارد.

const FIELDS = [
  { value: 'HUMANITIES', label: 'علوم انسانی', emoji: '📚', color: 'amber' },
  { value: 'MATH_PHYSICS', label: 'ریاضی و فیزیک', emoji: '📐', color: 'indigo' },
  { value: 'EXPERIMENTAL', label: 'علوم تجربی', emoji: '🧪', color: 'sage' },
];

const STEPS = [
  { key: 'account', label: 'حساب' },
  { key: 'institute', label: 'آموزشگاه' },
  { key: 'profile', label: 'پروفایل' },
];

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'ADVISOR' ? 'ADVISOR' : 'STUDENT';

  // با ?role=ADVISOR مستقیم وارد مرحله ۱ می‌شویم — تب «نقش» نداریم
  const [step, setStep] = useState(1);

  // فیلدهای فرم
  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [field, setField] = useState(''); // رشته‌ی تحصیلی دانش‌آموز (تکی)
  const [advisorFields, setAdvisorFields] = useState([]); // رشته‌های تخصص مشاور (چندتا)
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [advisorId, setAdvisorId] = useState('');
  const [instituteId, setInstituteId] = useState(''); // '' یعنی مستقل

  // داده‌های fetch شده
  const [institutes, setInstitutes] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [advisorsFetchedFor, setAdvisorsFetchedFor] = useState(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // بارگذاری لیست مؤسسه‌های فعال در mount
  useEffect(() => {
    fetchPublicInstitutes()
      .then((data) => setInstitutes(data.institutes || []))
      .catch(() => setInstitutes([]));
  }, []);

  // وقتی وارد مرحله‌ی ۳ می‌شویم، مشاوران را fetch می‌کنیم
  // فیلتر: instituteId (ممکن است '' یعنی مستقل) + field
  // نکته: advisorsLoading مشتق از advisorsFetchedFor است (نه state جدا) تا
  // فراخوانی setState همگام در بدنه‌ی افکت لازم نشود.
  const advisorsCacheKey = `${instituteId || 'independent'}|${field}`;
  const advisorsLoading =
    role === 'STUDENT' && step === 3 && !!field && advisorsFetchedFor !== advisorsCacheKey;

  useEffect(() => {
    if (role !== 'STUDENT') return;
    if (step !== 3) return;
    if (!field) return; // باید رشته انتخاب شده باشد

    // کلید cache: instituteId|field
    const cacheKey = `${instituteId || 'independent'}|${field}`;
    if (advisorsFetchedFor === cacheKey) return;

    let cancelled = false;
    fetchActiveAdvisors({
      instituteId: instituteId || undefined, // undefined یعنی مستقل
      field,
    })
      .then((data) => {
        if (cancelled) return;
        setAdvisors(data.advisors || []);
        setAdvisorsFetchedFor(cacheKey);
        // اگر قبلاً advisor انتخاب شده ولی دیگر در فهرست نیست، پاک کن
        if (advisorId && !(data.advisors || []).some((a) => a.id === advisorId)) {
          setAdvisorId('');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'خطا در بارگذاری مشاوران');
        setAdvisors([]);
        // حتی در خطا هم cacheKey را علامت بزن تا حلقه‌ی بی‌پایان fetch نشود؛
        // با تغییر رشته/مؤسسه دوباره تلاش می‌شود.
        setAdvisorsFetchedFor(cacheKey);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, step, instituteId, field]);

  function nextStep() {
    setError('');
    if (step === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError('نام کامل باید حداقل ۲ کاراکتر باشد');
        return;
      }
      if (!email.trim()) {
        setError('ایمیل الزامی است');
        return;
      }
      if (password.length < 8) {
        setError('رمز عبور باید حداقل ۸ کاراکتر باشد');
        return;
      }
      // اعتبارسنجی رشته‌ی تحصیلی
      if (role === 'STUDENT') {
        if (!field) {
          setError('انتخاب رشته‌ی تحصیلی الزامی است');
          return;
        }
      } else {
        // ADVISOR — باید حداقل یک رشته‌ی تخصص انتخاب کند
        if (advisorFields.length === 0) {
          setError('انتخاب حداقل یک رشته‌ی تخصص الزامی است');
          return;
        }
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length + 1));
  }

  function prevStep() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const payload = { fullName, email, password, role };
      if (phone.trim()) payload.phone = phone.trim();
      if (bio.trim()) payload.bio = bio.trim();
      if (role === 'STUDENT') {
        payload.advisorId = advisorId;
        payload.field = field; // رشته‌ی تکی دانش‌آموز
      } else {
        payload.fields = advisorFields; // آرایه‌ی رشته‌های تخصص مشاور
      }
      if (instituteId) payload.instituteId = instituteId;

      const data = await registerRequest(payload);

      if (data.user) {
        login(data);
        // پیام موفقیت به کاربر نمایش داده می‌شود، سپس هدایت
        if (role === 'STUDENT') {
          // دانش‌آموز را به داشبوردش می‌فرستیم؛ آنجا پیام «در انتظار تأیید مشاور» را می‌بیند
          navigate('/student', { replace: true });
        } else {
          navigate('/advisor', { replace: true });
        }
      } else {
        setSuccessMessage(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fieldLabel = (val) => FIELDS.find((f) => f.value === val)?.label || '';
  const fieldEmoji = (val) => FIELDS.find((f) => f.value === val)?.emoji || '';

  return (
    <div className="auth-page auth-min">
      <div className="auth-floats">
        <ThemeToggle />
        <Link to="/" className="auth-back-home">
          <span aria-hidden>←</span> خانه
        </Link>
      </div>

      <div className="auth-card-min auth-card-min-wide">
        <div className="auth-brand-min">
          <Logo size={46} title="دانش‌آموزینو" />
          <h1>ساخت حساب کاربری</h1>
          <p>
            {role === 'STUDENT'
              ? 'در سه قدم حساب می‌سازی و برنامه‌ی هفته‌ات را از مشاورت می‌گیری.'
              : 'در سه قدم پنل مشاوری‌ات آماده می‌شود.'}
          </p>
          {/* سوییچ نقش — جایگزین تب «نقش» */}
          <div className="role-switch">
            <button
              type="button"
              className={role === 'STUDENT' ? 'active' : ''}
              onClick={() => setRole('STUDENT')}
            >
              🎒 دانش‌آموز
            </button>
            <button
              type="button"
              className={role === 'ADVISOR' ? 'active' : ''}
              onClick={() => setRole('ADVISOR')}
            >
              🎓 مشاور
            </button>
          </div>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          {/* نوار پیشرفت مراحل */}
          <ol className="step-progress">
            {STEPS.map((s, idx) => (
              <li
                key={s.key}
                className={`step-progress-item ${
                  idx < step ? 'done' : idx === step ? 'active' : ''
                }`}
              >
                <span className="step-progress-num">
                  {idx < step ? '✓' : String(idx + 1)}
                </span>
                <span className="step-progress-label">{s.label}</span>
              </li>
            ))}
          </ol>

          {/* مرحله ۱: اطلاعات حساب + انتخاب رشته */}
          {step === 1 && (
            <div className="step-panel">
              <label className="field-label">
                نام کامل
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثلاً علی رضایی"
                  required
                  autoFocus
                />
              </label>

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

              {/* انتخاب رشته‌ی تحصیلی */}
              <div className="field-label">
                {role === 'STUDENT' ? 'رشته‌ی تحصیلی شما' : 'رشته‌های تخصص شما (می‌توانید چندتا انتخاب کنید)'}
                {role === 'STUDENT' ? (
                  // دانش‌آموز: انتخاب تکی (رادیویی)
                  <div className="field-picker">
                    {FIELDS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        className={`field-card field-card-${f.color} ${field === f.value ? 'active' : ''}`}
                        onClick={() => setField(f.value)}
                      >
                        <span className="field-emoji" aria-hidden>{f.emoji}</span>
                        <span className="field-name">{f.label}</span>
                        {field === f.value && <span className="field-check" aria-hidden>✓</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  // مشاور: انتخاب چندتا (چک‌باکس)
                  <div className="field-picker">
                    {FIELDS.map((f) => {
                      const isSelected = advisorFields.includes(f.value);
                      return (
                        <button
                          key={f.value}
                          type="button"
                          className={`field-card field-card-${f.color} ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setAdvisorFields((prev) =>
                              isSelected
                                ? prev.filter((v) => v !== f.value)
                                : [...prev, f.value]
                            );
                          }}
                        >
                          <span className="field-emoji" aria-hidden>{f.emoji}</span>
                          <span className="field-name">{f.label}</span>
                          {isSelected && <span className="field-check" aria-hidden>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                <span className="field-hint">
                  {role === 'STUDENT'
                    ? '🎓 در مرحله‌ی بعد فقط مشاوران همین رشته به تو نشان داده می‌شوند.'
                    : advisorFields.length === 0
                      ? '🎓 حداقل یک رشته باید انتخاب کنی. دانش‌آموزان فقط رشته‌های تو را می‌بینند.'
                      : `✓ ${toFaDigits(advisorFields.length)} رشته انتخاب شده: ${advisorFields.map((f) => fieldLabel(f)).join('، ')}`}
                </span>
              </div>

              <div className="step-actions">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  بازگشت
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  مرحله‌ی بعد ←
                </button>
              </div>
            </div>
          )}

          {/* مرحله ۲: انتخاب مؤسسه از لیست */}
          {step === 2 && (
            <div className="step-panel">
              <p className="step-intro">
                {role === 'STUDENT'
                  ? 'اگر بخشی از یک آموزشگاه هستی، آن را از لیست انتخاب کن. این مهم است چون در مرحله‌ی بعد فقط مشاوران همان آموزشگاه به تو نشان داده می‌شوند. اگر آموزشگاهی در کار نیستی، «مستقل» را انتخاب کن.'
                  : 'اگر مشاورِ یک آموزشگاه هستی، آن را از لیست انتخاب کن تا حسابت توسط مدیر آموزشگاه تأیید شود. اگر مستقل هستی، «مستقل» را انتخاب کن تا توسط سوپرادمین تأیید شوی.'}
              </p>

              <div className="field-label">
                آموزشگاه
                <div className="institute-picker">
                  <button
                    type="button"
                    className={`institute-card ${instituteId === '' ? 'active' : ''}`}
                    onClick={() => setInstituteId('')}
                  >
                    <span className="institute-emoji" aria-hidden>👤</span>
                    <div className="institute-info">
                      <strong>مستقل</strong>
                      <small>بدون آموزشگاه — تأیید توسط سوپرادمین</small>
                    </div>
                    {instituteId === '' && <span className="field-check" aria-hidden>✓</span>}
                  </button>
                  {institutes.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      className={`institute-card ${instituteId === inst.id ? 'active' : ''}`}
                      onClick={() => setInstituteId(inst.id)}
                    >
                      <span className="institute-emoji" aria-hidden>🏫</span>
                      <div className="institute-info">
                        <strong>{inst.name}</strong>
                        <small>{toFaDigits(inst.activeAdvisorCount)} مشاور فعال</small>
                      </div>
                      {instituteId === inst.id && <span className="field-check" aria-hidden>✓</span>}
                    </button>
                  ))}
                  {institutes.length === 0 && (
                    <p className="muted-text" style={{ fontSize: 12 }}>
                      فعلاً آموزشگاه فعالی ثبت نشده. می‌توانی «مستقل» را انتخاب کنی.
                    </p>
                  )}
                </div>
                <span className="field-hint">
                  {instituteId
                    ? `🏫 در مرحله‌ی بعد فقط مشاوران «${institutes.find((i) => i.id === instituteId)?.name || ''}» نمایش داده می‌شوند.`
                    : '👤 فقط مشاوران مستقل نمایش داده می‌شوند.'}
                </span>
              </div>

              <div className="step-actions">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  بازگشت
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  مرحله‌ی بعد ←
                </button>
              </div>
            </div>
          )}

          {/* مرحله ۳: اطلاعات پروفایل + انتخاب مشاور (کارت بصری) */}
          {step === 3 && (
            <div className="step-panel">
              <label className="field-label">
                شماره تماس
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثلاً ۰۹۱۲۳۴۵۶۷۸۹"
                  dir="ltr"
                  required
                />
                <span className="field-hint">
                  الزامی — مشاور یا مؤسسه با این شماره با تو در ارتباط خواهد بود.
                  فرمت‌ها: ۰۹۱۲۳۴۵۶۷۸۹، +۹۸۹۱۲۳۴۵۶۷۸۹
                </span>
              </label>

              <label className="field-label">
                {role === 'ADVISOR' ? 'توضیحات درباره‌ی شما' : 'توضیحات (اختیاری)'}
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={
                    role === 'ADVISOR'
                      ? 'مثلاً: مدرس ریاضی با ۱۰ سال سابقه، فارغ‌التحصیل دانشگاه تهران…'
                      : 'مثلاً: رشته‌ی تجربی، پایه‌ی دوازدهم، هدف کنکور ۱۴۰۴…'
                  }
                  rows={3}
                  maxLength={500}
                />
                <span className="field-hint">
                  {role === 'ADVISOR'
                    ? 'این توضیحات برای سوپرادمین/مدیر مؤسسه نمایش داده می‌شود.'
                    : 'این توضیحات برای مشاورت نمایش داده می‌شود.'}
                </span>
              </label>

              {role === 'STUDENT' && (
                <div className="field-label">
                  انتخاب مشاور
                  <span className="field-hint" style={{ marginBottom: 8 }}>
                    {fieldEmoji(field)} {fieldLabel(field)} · {instituteId ? `🏫 ${institutes.find((i) => i.id === instituteId)?.name || ''}` : '👤 مستقل'}
                    {' '}— بعد از انتخاب، درخواست برای مشاور ارسال می‌شود.
                  </span>

                  {advisorsLoading ? (
                    <div className="muted-text" style={{ padding: '20px 0', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto 8px' }} />
                      در حال بارگذاری مشاوران…
                    </div>
                  ) : advisors.length === 0 ? (
                    <div className="empty-card small">
                      <span className="empty-emoji" aria-hidden>🔍</span>
                      <p>فعلاً مشاوری برای این فیلتر وجود ندارد.</p>
                      <p className="muted-text" style={{ fontSize: 12 }}>
                        می‌توانی به مرحله‌ی قبل برگردی و مؤسسه یا رشته‌ی دیگری انتخاب کنی.
                      </p>
                    </div>
                  ) : (
                    <div className="advisor-card-grid">
                      {advisors.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`advisor-pick-card ${advisorId === a.id ? 'selected' : ''}`}
                          onClick={() => setAdvisorId(a.id)}
                        >
                          <div className="advisor-pick-avatar">
                            {a.photoUrl ? (
                              <img src={a.photoUrl} alt="" className="avatar-photo" />
                            ) : (
                              (a.fullName || '؟').charAt(0)
                            )}
                          </div>
                          <div className="advisor-pick-body">
                            <strong className="advisor-pick-name">{a.fullName}</strong>
                            {/* نمایش همه‌ی رشته‌های تخصص مشاور */}
                            {a.fields && a.fields.length > 0 && (
                              <div className="advisor-pick-fields">
                                {a.fields.map((f) => (
                                  <span
                                    key={f}
                                    className={`advisor-pick-field field-pill-${f.toLowerCase().replace('_', '-')}`}
                                  >
                                    {fieldEmoji(f)} {fieldLabel(f)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {a.bio && (
                              <p className="advisor-pick-bio">{a.bio}</p>
                            )}
                            <span className="advisor-pick-stats">
                              👥 {toFaDigits(a.activeStudentCount)} دانش‌آموز فعال
                            </span>
                          </div>
                          {advisorId === a.id && (
                            <span className="advisor-pick-check" aria-hidden>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="alert alert-error">
                  <span>⚠</span> {error}
                </div>
              )}
              {successMessage && (
                <div className="alert alert-success">
                  <span>✓</span> {successMessage}
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-secondary" onClick={prevStep} disabled={loading}>
                  بازگشت
                </button>
                <button type="submit" className="btn-primary" disabled={loading || (role === 'STUDENT' && !advisorId)}>
                  {loading ? 'در حال ثبت‌نام…' : '✓ ثبت‌نام نهایی'}
                </button>
              </div>
            </div>
          )}

        </form>

        <div className="auth-min-footer">
          از قبل حساب داری؟ <Link to="/login">وارد شو</Link>
        </div>
      </div>
    </div>
  );
}
