import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchActiveAdvisors,
  fetchPublicInstitutes,
  updateMyProfile,
  chooseMyAdvisor,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toFaDigits } from '../utils/jalali';
import Ico from './Ico';

// مودال «تکمیل ثبت‌نام» — بلافاصله بعد از ثبت‌نام مینیمال (فقط شماره+رمز) باز می‌شود
// و کاربر همان‌جا بقیه‌ی مشخصاتش را می‌دهد؛ داشبورد پشتش آماده است ولی پنجره
// تا تکمیل بسته نمی‌شود (بدون دکمه‌ی «بعداً» — تا کاربر وسط راه رها نکند).
//   همه: نام کامل (اگر هنوز نام موقت ثبت‌نام را دارد)
//   دانش‌آموز: رشته‌ی تحصیلی + (اختیاری) مؤسسه + انتخاب مشاور
//   مشاور: رشته‌های تخصص + توضیحات کوتاه
// والد به این مودال نیازی ندارد (ثبت‌نامش کامل است).
//
// نکته: انتخاب مؤسسه مثل ثبت‌نام، حساب را به صف تأیید مدیر مؤسسه می‌فرستد؛
// در آن حالت با پیام شفاف به صفحه‌ی ورود هدایت می‌شویم.

const FIELDS = [
  { value: 'HUMANITIES', label: 'علوم انسانی', emoji: '📚', color: 'amber' },
  { value: 'MATH_PHYSICS', label: 'ریاضی و فیزیک', emoji: '📐', color: 'indigo' },
  { value: 'EXPERIMENTAL', label: 'علوم تجربی', emoji: '🧪', color: 'sage' },
];

const ADVISORS_PER_PAGE = 2;
const fieldLabel = (v) => FIELDS.find((f) => f.value === v)?.label || '';
const fieldEmoji = (v) => FIELDS.find((f) => f.value === v)?.emoji || '';

// نام‌های موقتی که ثبت‌نام مینیمال خودبخود می‌سازد — تا وقتی کاربر نام واقعی‌اش
// را نگذاشته، فیلد نام در مودال دیده و الزامی می‌شود.
const PLACEHOLDER_NAMES = ['', 'دانش‌آموز جدید', 'مشاور جدید'];

export default function RegistrationCompleteModal({ role }) {
  // onComplete لازم نیست — updateUser مستقیم از context صدا زده می‌شود
  const { auth, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const currentName = String(auth?.user?.fullName || '').trim();
  const isPlaceholderName = PLACEHOLDER_NAMES.includes(currentName);

  const [fullName, setFullName] = useState(currentName);
  const [field, setField] = useState('');
  const [advisorFields, setAdvisorFields] = useState([]);
  const [bio, setBio] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [advisorId, setAdvisorId] = useState('');
  const [advisorPage, setAdvisorPage] = useState(0);

  const [institutes, setInstitutes] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [advisorsFetchedFor, setAdvisorsFetchedFor] = useState(null);
  // مشتق از advisorsFetchedFor — نه state جدا، تا setState همگام در افکت لازم نشود
  const advisorsCacheKey = `${instituteId || 'independent'}|${field}`;
  const advisorsLoading = role === 'STUDENT' && !!field && advisorsFetchedFor !== advisorsCacheKey;

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);

  const isStudent = role === 'STUDENT';
  // دانش‌آموز فقط وقتی نامش را می‌گذارد که هنوز نام موقت ثبت‌نام را دارد
  // (بک‌اند تغییر مکرر نام دانش‌آموز را مسدود می‌کند)؛ مشاور همیشه می‌تواند.
  const showNameField = isStudent ? isPlaceholderName : true;

  useEffect(() => {
    fetchPublicInstitutes()
      .then((data) => setInstitutes(data.institutes || []))
      .catch(() => setInstitutes([]));
  }, []);

  // مشاوران فقط بعد از انتخاب رشته بارگذاری می‌شوند (فیلتر رشته + مؤسسه)
  useEffect(() => {
    if (!isStudent || !field) return undefined;
    if (advisorsFetchedFor === advisorsCacheKey) return undefined;
    let cancelled = false;
    fetchActiveAdvisors({ instituteId: instituteId || undefined, field })
      .then((data) => {
        if (cancelled) return;
        setAdvisors(data.advisors || []);
        setAdvisorPage(0);
        setAdvisorsFetchedFor(advisorsCacheKey);
        if (advisorId && !(data.advisors || []).some((a) => a.id === advisorId)) {
          setAdvisorId('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdvisors([]);
          setAdvisorsFetchedFor(advisorsCacheKey); // حتی در خطا علامت بزن تا حلقه نشود
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, field, instituteId]);

  const advisorPages = Math.max(1, Math.ceil(advisors.length / ADVISORS_PER_PAGE));
  const safeAdvisorPage = Math.min(advisorPage, advisorPages - 1);
  const visibleAdvisors = useMemo(
    () => advisors.slice(safeAdvisorPage * ADVISORS_PER_PAGE, (safeAdvisorPage + 1) * ADVISORS_PER_PAGE),
    [advisors, safeAdvisorPage]
  );

  function toggleAdvisorField(value) {
    setAdvisorFields((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (isStudent && !field) {
      setError('رشته‌ی تحصیلی‌ات را انتخاب کن');
      return;
    }
    if (!isStudent && advisorFields.length === 0) {
      setError('حداقل یک رشته‌ی تخصص انتخاب کن');
      return;
    }
    const trimmedName = fullName.trim();
    if (showNameField && isPlaceholderName && trimmedName.length < 2) {
      setError('نام کامل خودت را وارد کن');
      return;
    }

    setSaving(true);
    try {
      const payload = isStudent
        ? { field, instituteId: instituteId || null }
        : { fields: advisorFields };
      if (!isStudent && bio.trim()) payload.bio = bio.trim();
      // نام — فقط وقتی تغییر کرده باشد فرستاده می‌شود (سقف/محدودیت سمت سرور)
      if (showNameField && trimmedName.length >= 2 && trimmedName !== currentName) {
        payload.fullName = trimmedName;
      }

      const data = await updateMyProfile(payload);
      const updatedUser = data.user || {};

      // دانش‌آموزی که مؤسسه انتخاب کرده → PENDING تا تأیید مدیر؛
      // جلسه‌اش عملاً تعطیل می‌شود — با پیام شفاف به ورود می‌فرستیمش.
      if (updatedUser.status === 'PENDING' && updatedUser.instituteId) {
        setInfo('درخواست عضویت در مؤسسه ثبت شد. پس از تأیید مدیر مؤسسه دوباره وارد شو.');
        setTimeout(async () => {
          await logout();
          navigate('/login', { replace: true });
        }, 2600);
        return;
      }

      // انتخاب مشاور (اختیاری) — درخواست اتصال برای مشاور ارسال می‌شود؛
      // پیام «درخواست ارسال شد» بعد از بستن مودال، در خود داشبورد دیده می‌شود.
      if (isStudent && advisorId) {
        await chooseMyAdvisor(advisorId);
      }

      updateUser({ ...updatedUser, registrationComplete: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const steps = isStudent
    ? ['نام و رشته', 'مؤسسه (اختیاری)', 'مشاور (اختیاری)']
    : ['نام', 'تخصص‌ها', 'توضیحات'];

  return (
    <div className="modal-overlay">
      <div className="profile-modal registration-modal" role="dialog" aria-modal="true" aria-labelledby="rcm-title">
        <div className="profile-modal-head registration-modal-head">
          <div>
            <h3 id="rcm-title">
              <span aria-hidden><Ico e="🧩" /></span>
              {isStudent ? 'ثبت‌نامت را کامل کن' : 'تخصصت را کامل کن'}
            </h3>
            <p className="registration-head-sub">
              {isStudent
                ? 'سه قدم کوچک تا داشبورد کاملت'
                : 'سه قدم کوچک تا دیده‌شدن توسط دانش‌آموزها'}
            </p>
          </div>
          <span className="registration-badge">۲ دقیقه</span>
        </div>
        <ol className="registration-steps" aria-label="مرحله‌ها">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="muted-text registration-lead">
          {isStudent
            ? 'با انتخاب رشته، مشاورهایی که همان رشته را پوشش می‌دهند به تو نشان داده می‌شود.'
            : 'دانش‌آموزان فقط در رشته‌هایی که اینجا انتخاب کنی می‌توانند تو را ببینند.'}
        </p>

        <form onSubmit={handleSubmit} className="registration-form">
          {showNameField && (
            <label className="field-label span-2">
              نام کامل
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثلاً علی رضایی"
                maxLength={80}
                required
                autoFocus
              />
              <span className="field-hint">
                {isStudent
                  ? 'همین یک بار انتخاب می‌کنی؛ نامت در پنل و کنار برنامه‌ها دیده می‌شود.'
                  : 'نامت را دانش‌آموزها می‌بینند.'}
              </span>
            </label>
          )}

          {isStudent ? (
            <>
              <div className="field-label span-2">
                رشته‌ی تحصیلی شما
                <div className="field-picker">
                  {FIELDS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className={`field-card field-card-${f.color} ${field === f.value ? 'active' : ''}`}
                      onClick={() => setField(f.value)}
                    >
                      <span className="field-emoji" aria-hidden><Ico e={f.emoji} /></span>
                      <span className="field-name">{f.label}</span>
                      {field === f.value && <span className="field-check" aria-hidden><Ico e="✓" /></span>}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field-label">
                آموزشگاه (اختیاری)
                <select value={instituteId} onChange={(e) => setInstituteId(e.target.value)}>
                  <option value="">مستقل (بدون آموزشگاه)</option>
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} — {toFaDigits(inst.activeAdvisorCount)} مشاور فعال
                    </option>
                  ))}
                </select>
                <span className="field-hint">
                  با عضویت در مؤسسه، حساب شما پس از تأیید مدیر مؤسسه فعال می‌شود.
                </span>
              </label>

              <div className="field-label span-2">
                انتخاب مشاور (اختیاری)
                {advisorsLoading ? (
                  <div className="muted-text registration-advisors-loading">
                    <div className="spinner" /> در حال بارگذاری مشاوران…
                  </div>
                ) : !field ? (
                  <div className="empty-card small">
                    <span className="empty-emoji" aria-hidden><Ico e="👆" /></span>
                    <p>اول رشته‌ات را انتخاب کن تا مشاورها نمایش داده شوند.</p>
                  </div>
                ) : advisors.length === 0 ? (
                  <div className="empty-card small">
                    <span className="empty-emoji" aria-hidden><Ico e="🔍" /></span>
                    <p>فعلاً مشاوری برای این فیلتر وجود ندارد — می‌توانی بعداً از پروفایل انتخاب کنی.</p>
                  </div>
                ) : (
                  <>
                    {advisorPages > 1 && (
                      <div className="advisor-pager">
                        <button
                          type="button"
                          className="btn-secondary pager-btn"
                          aria-label="مشاوران قبلی"
                          onClick={() => setAdvisorPage(Math.max(0, safeAdvisorPage - 1))}
                          disabled={safeAdvisorPage === 0}
                        >
                          <i className="ti ti-chevron-right" aria-hidden="true" />
                        </button>
                        <span>{toFaDigits(safeAdvisorPage + 1)} از {toFaDigits(advisorPages)}</span>
                        <button
                          type="button"
                          className="btn-secondary pager-btn"
                          aria-label="مشاوران بعدی"
                          onClick={() => setAdvisorPage(Math.min(advisorPages - 1, safeAdvisorPage + 1))}
                          disabled={safeAdvisorPage >= advisorPages - 1}
                        >
                          <i className="ti ti-chevron-left" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <div className="advisor-card-grid">
                      {visibleAdvisors.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`advisor-pick-card ${advisorId === a.id ? 'selected' : ''}`}
                          onClick={() => setAdvisorId(advisorId === a.id ? '' : a.id)}
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
                            {a.bio && <p className="advisor-pick-bio">{a.bio}</p>}
                            <span className="advisor-pick-stats">
                              <Ico e="👥" /> {toFaDigits(a.activeStudentCount)} دانش‌آموز فعال
                            </span>
                          </div>
                          {advisorId === a.id && (
                            <span className="advisor-pick-check" aria-hidden><Ico e="✓" /></span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <span className="field-hint">
                  بعد از انتخاب، درخواست برای مشاور ارسال می‌شود و با تأیید او برنامه‌ات را می‌بینی.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="field-label span-2">
                رشته‌های تخصص شما (می‌توانید چندتا انتخاب کنید)
                <div className="field-picker">
                  {FIELDS.map((f) => {
                    const isSelected = advisorFields.includes(f.value);
                    return (
                      <button
                        key={f.value}
                        type="button"
                        className={`field-card field-card-${f.color} ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleAdvisorField(f.value)}
                      >
                        <span className="field-emoji" aria-hidden><Ico e={f.emoji} /></span>
                        <span className="field-name">{f.label}</span>
                        {isSelected && <span className="field-check" aria-hidden><Ico e="✓" /></span>}
                      </button>
                    );
                  })}
                </div>
                <span className="field-hint">
                  {advisorFields.length === 0
                    ? 'حداقل یک رشته باید انتخاب کنی.'
                    : <><Ico e="✓" /> {toFaDigits(advisorFields.length)} رشته انتخاب شده: {advisorFields.map((f) => fieldLabel(f)).join('، ')}</>}
                </span>
              </div>

              <label className="field-label span-2">
                توضیحات درباره‌ی شما
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="مثلاً: مدرس ریاضی با ۱۰ سال سابقه، فارغ‌التحصیل دانشگاه تهران…"
                />
                <span className="field-hint">
                  این توضیحات در کارت شما برای دانش‌آموزان و سوپرادمین نمایش داده می‌شود.
                </span>
              </label>
            </>
          )}

          {error && (
            <div className="alert alert-error span-2">
              <span><Ico e="⚠" /></span> {error}
            </div>
          )}
          {info && (
            <div className="alert alert-success span-2">
              <span><Ico e="✓" /></span> {info}
            </div>
          )}

          <div className="step-actions span-2">
            <button type="submit" className="btn-primary btn-block" disabled={saving}>
              {saving ? 'در حال ذخیره…' : <><Ico e="✓" /> ذخیره و ورود به پنل</>}
            </button>
            <span className="registration-footnote">
              مؤسسه و مشاور اختیاری‌اند — بعداً هم از پروفایل قابل تکمیل‌اند.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
