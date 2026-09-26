import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchInstituteMe, fetchInstituteAdvisors, fetchInstituteStudents, approveMember, rejectMember, removeInstituteMember, assignStudentAdvisor } from '../api/client';
import { formatJalaliDate, toFaDigits } from '../utils/jalali';

// پنل مدیریت مؤسسه — «مؤسسه‌ی من»
// مدیر فقط داده‌های مؤسسه‌ی خودش را می‌بیند (اسکوپ سمت سرور از JWT می‌آید):
//   • نمای کلی: تعداد مشاوران، دانش‌آموزان، درخواست‌های در انتظار
//   • فهرست مشاوران + دانش‌آموزان هرکدام (فقط نام و وضعیت — نه محتوای خصوصی)
//   • تأیید/رد اعضای در انتظار (نقش و مؤسسه از این پنل تغییر نمی‌کنند)
export default function InstituteDashboard() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [institute, setInstitute] = useState(null);
  const [advisors, setAdvisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { member, action }
  // انتخاب مشاور برای دانش‌آموز — هم هنگام تأیید و هم برای دانش‌آموزِ بدون مشاور
  const [advisorPicker, setAdvisorPicker] = useState(null); // { student, advisorId }

  // خروج: پاک‌کردن جلسه و بازگشت به صفحه‌ی ورود (نه صفحه‌ی معرفی)
  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // بارگذاری داده‌ها؛ silent=true برای به‌روزرسانی پس از تأیید/رد (بدون پرش صفحه)
  function load(silent = false) {
    if (!silent) setLoading(true);
    return Promise.all([fetchInstituteMe(), fetchInstituteAdvisors(), fetchInstituteStudents()])
      .then(([meData, advData, stuData]) => {
        setInstitute(meData.institute);
        setAdvisors(advData.advisors);
        setStudents(stuData.students);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // بارگذاری اولیه — loading از قبل true است؛ فراخوانی مستقیم setState در بدنه‌ی افکت نداریم
    let active = true;
    Promise.all([fetchInstituteMe(), fetchInstituteAdvisors()])
      .then(([meData, advData]) => {
        if (!active) return;
        setInstitute(meData.institute);
        setAdvisors(advData.advisors);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleDecision() {
    const { member, action } = confirmState;
    setConfirmState(null);
    try {
      const res = action === 'approve' ? await approveMember(member.id) : await rejectMember(member.id);
      toast.success(res.message || 'انجام شد');
      load(true);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // حذف عضو از مؤسسه (مستقل می‌شود — کاربر پاک نمی‌شود)
  function requestRemoveMember(member) {
    setConfirmState({
      member,
      action: 'remove',
    });
  }

  async function handleRemoveMember() {
    const member = confirmState.member;
    setConfirmState(null);
    try {
      const res = await removeInstituteMember(member.id);
      toast.success(res.message || 'عضو حذف شد');
      load(true);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const pending = institute?.pendingCount || 0;

  // ذخیره‌ی مشاور انتخابی برای دانش‌آموز (مودال انتخاب مشاور)
  async function handleSaveAdvisor() {
    if (!advisorPicker?.advisorId) {
      toast.error('یک مشاور انتخاب کنید');
      return;
    }
    try {
      const res = await assignStudentAdvisor(advisorPicker.student.id, advisorPicker.advisorId);
      toast.success(res.message || 'مشاور تخصیص یافت');
      setAdvisorPicker(null);
      load(true);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const activeAdvisors = advisors.filter((a) => a.status === 'ACTIVE');

  return (
    <div className="institute-app">
      <AppHeader
        fullName={auth.user.fullName}
        greeting={auth.user.fullName}
        avatarClass="advisor-avatar"
        onLogout={handleLogout}
      />

      <main className="page-body">
        {error && (
          <div className="alert alert-error" onClick={() => setError('')}>
            <span>⚠</span> {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>در حال بارگذاری مؤسسه…</p>
          </div>
        ) : institute ? (
          <>
            {/* ---------- نمای کلی ---------- */}
            <section>
              <div className="section-head">
                <h3 className="section-title">
                  <span className="section-emoji">🏫</span>
                  {institute.name}
                </h3>
                {pending > 0 && (
                  <span className="badge-updated">{toFaDigits(pending)} درخواست در انتظار</span>
                )}
              </div>

              <div className="stats-grid">
                <div className="stat-card stat-indigo">
                  <span className="stat-icon">🎓</span>
                  <div>
                    <div className="stat-value">{toFaDigits(institute.advisorCount)}</div>
                    <div className="stat-label">مشاور</div>
                  </div>
                </div>
                <div className="stat-card stat-sage">
                  <span className="stat-icon">🎒</span>
                  <div>
                    <div className="stat-value">{toFaDigits(institute.studentCount)}</div>
                    <div className="stat-label">دانش‌آموز</div>
                  </div>
                </div>
                <div className="stat-card stat-amber">
                  <span className="stat-icon">⏳</span>
                  <div>
                    <div className="stat-value">{toFaDigits(pending)}</div>
                    <div className="stat-label">در انتظار تأیید</div>
                  </div>
                </div>
                <div className={`stat-card ${institute.subscription?.status === 'ACTIVE' || institute.subscription?.status === 'TRIAL' ? 'stat-sage' : 'stat-pink'}`}>
                  <span className="stat-icon">{institute.subscription?.status === 'ACTIVE' || institute.subscription?.status === 'TRIAL' ? '✅' : '⚠️'}</span>
                  <div>
                    <div className="stat-value">
                      {institute.subscription
                        ? institute.subscription.status === 'ACTIVE'
                          ? 'فعال'
                          : institute.subscription.status === 'TRIAL'
                            ? 'آزمایشی'
                            : institute.subscription.status === 'GRACE'
                              ? 'تمدید نشده'
                              : 'منقضی'
                        : '—'}
                    </div>
                    <div className="stat-label">
                      {institute.subscription?.endsAt
                        ? `تا ${formatJalaliDate(institute.subscription.endsAt, { withYear: false })}`
                        : 'اشتراک'}
                    </div>
                  </div>
                </div>
              </div>

              {/* هشدار ظرفیت — وقتی سقف اعضا تعیین شده و نزدیک/تکمیل است */}
              {institute.limits && (institute.limits.maxAdvisors != null || institute.limits.maxStudents != null) && (
                <div className="alert alert-error" style={{ marginTop: 'var(--gap-md)', cursor: 'default' }}>
                  <span>🚧</span>
                  <div>
                    {institute.limits.maxAdvisors != null && (
                      <div>
                        ظرفیت مشاور: {toFaDigits(institute.advisorCount)} از {toFaDigits(institute.limits.maxAdvisors)}
                        {institute.limits.advisorsRemaining === 0 && ' — تکمیل!'}
                      </div>
                    )}
                    {institute.limits.maxStudents != null && (
                      <div>
                        ظرفیت دانش‌آموز: {toFaDigits(institute.studentCount)} از {toFaDigits(institute.limits.maxStudents)}
                        {institute.limits.studentsRemaining === 0 && ' — تکمیل!'}
                      </div>
                    )}
                    ظرفیت تکمیل شود، عضو جدید پذیرفته نمی‌شود؛ برای بیشتر، اشتراک را ارتقا دهید.
                  </div>
                </div>
              )}

              <div className="card" style={{ marginTop: 'var(--gap-md)' }}>
                <strong>کد دعوت مؤسسه</strong>
                <p className="muted-text" style={{ marginTop: 6 }}>
                  این کد را به مشاوران و دانش‌آموزان مؤسسه بدهید تا هنگام ثبت‌نام وارد کنند:
                </p>
                <div className="institute-code-box" dir="ltr">
                  {institute.code}
                </div>
                <button
                  className="btn-secondary btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => navigate('/deposit')}
                  title="واریز و تمدید اشتراک مؤسسه"
                >
                  💳 واریز و تمدید اشتراک مؤسسه
                </button>
              </div>
            </section>

            {/* ---------- تأیید اعضای در انتظار (و تأیید مجددِ ردشده‌ها) ---------- */}
            {(pending > 0 || advisors.some((a) => a.status === 'REJECTED')) && (
              <section>
                <div className="section-head">
                  <h3 className="section-title">
                    <span className="section-emoji">⏳</span>
                    درخواست‌های عضویت
                  </h3>
                </div>
                <div className="card">
                  {advisors
                    .filter((a) => a.status === 'PENDING' || a.status === 'REJECTED')
                    .map((a) => (
                      <MemberRow
                        key={a.id}
                        member={a}
                        onDecide={(action) => setConfirmState({ member: a, action })}
                      />
                    ))}
                </div>
              </section>
            )}

            {/* ---------- دانش‌آموزان مؤسسه ---------- */}
            <section>
              <div className="section-head">
                <h3 className="section-title">
                  <span className="section-emoji">🎒</span>
                  دانش‌آموزان مؤسسه
                </h3>
              </div>
              <div className="institute-advisor-list">
                {students.length === 0 ? (
                  <div className="card">
                    <p className="muted-text">هنوز دانش‌آموزی عضو مؤسسه نشده است.</p>
                  </div>
                ) : (
                  students.map((s) => (
                    <div key={s.id} className="card institute-advisor-card">
                      <div className="institute-advisor-head institute-student-head">
                        <span className="advisor-avatar">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt="" className="avatar-photo" />
                          ) : (
                            s.fullName?.[0] || '؟'
                          )}
                        </span>
                        <div className="institute-advisor-info">
                          <strong>{s.fullName}</strong>
                          <small dir="ltr">{s.email}</small>
                          {s.phone && <small dir="ltr">📞 {toFaDigits(s.phone)}</small>}
                          {s.bio && <small className="muted-text">{s.bio.slice(0, 80)}{s.bio.length > 80 ? '…' : ''}</small>}
                        </div>
                        <div className="institute-student-advisor">
                          {s.advisor ? (
                            <span className="muted-text">🎓 {s.advisor.fullName}</span>
                          ) : s.pendingAdvisor ? (
                            <span className="muted-text" title="مشاوری که خود دانش‌آموز هنگام ثبت‌نام انتخاب کرده — با تأیید عضو، این اتصال فعال می‌شود">⏳ درخواست به {s.pendingAdvisor.fullName}</span>
                          ) : (
                            <span className="muted-text">بدون مشاور</span>
                          )}
                        </div>
                        <span className={`status-pill ${s.status === 'ACTIVE' ? 'done' : s.status === 'PENDING' ? 'pending' : 'skipped'}`}>
                          {s.status === 'ACTIVE' ? 'فعال' : s.status === 'PENDING' ? 'در انتظار' : 'رد شده'}
                        </span>
                        {(s.status === 'PENDING' || s.status === 'REJECTED') && (
                          <div className="institute-member-actions">
                            <button className="btn-primary btn-sm" onClick={() => setConfirmState({ member: s, action: 'approve' })}>
                              {s.status === 'REJECTED' ? 'تأیید مجدد' : 'تأیید'}
                            </button>
                            {s.status === 'PENDING' && (
                              <button className="btn-secondary btn-sm" onClick={() => setConfirmState({ member: s, action: 'reject' })}>
                                رد
                              </button>
                            )}
                          </div>
                        )}
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setAdvisorPicker({ student: s, advisorId: s.advisor?.id || '' })}
                          title={s.advisor ? 'تغییر مشاور این دانش‌آموز' : 'تعیین مشاور برای این دانش‌آموز'}
                        >
                          🎓 {s.advisor ? 'تغییر مشاور' : 'تعیین مشاور'}
                        </button>
                        <button
                          className="btn-secondary btn-sm btn-danger"
                          onClick={() => requestRemoveMember(s)}
                          title="حذف از مؤسسه (به مستقل تبدیل می‌شود)"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* ---------- مشاوران و دانش‌آموزانشان ---------- */}
            <section>
              <div className="section-head">
                <h3 className="section-title">
                  <span className="section-emoji">👥</span>
                  مشاوران و دانش‌آموزان
                </h3>
              </div>
              <div className="institute-advisor-list">
                {advisors
                  .filter((a) => a.status !== 'PENDING')
                  .map((a) => (
                    <div key={a.id} className="card institute-advisor-card">
                      <button
                        type="button"
                        className="institute-advisor-head"
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                        aria-expanded={expandedId === a.id}
                      >
                        <span className="advisor-avatar">{a.fullName?.[0] || '؟'}</span>
                        <div className="institute-advisor-info">
                          <strong>{a.fullName}</strong>
                          <small dir="ltr">{a.email}</small>
                        </div>
                        <span className={`status-pill ${a.status === 'ACTIVE' ? 'done' : 'pending'}`}>
                          {a.status === 'ACTIVE' ? 'فعال' : 'رد شده'}
                        </span>
                        <span className="date-chip">{toFaDigits(a.students.length)} دانش‌آموز</span>
                        <span className={`chevron ${expandedId === a.id ? 'open' : ''}`}>‹</span>
                      </button>

                      {expandedId === a.id && (
                        <div className="institute-student-list">
                          {a.students.length === 0 ? (
                            <p className="muted-text">هنوز دانش‌آموزی ندارد.</p>
                          ) : (
                            a.students.map((s) => (
                              <div key={s.id} className="institute-student-row">
                                <span className="student-avatar">{s.fullName?.[0] || '؟'}</span>
                                <span>{s.fullName}</span>
                                <span className={`status-pill ${s.status === 'ACTIVE' ? 'done' : s.status === 'REJECTED' ? 'skipped' : 'pending'}`}>
                                  {s.status === 'ACTIVE' ? 'فعال' : s.status === 'PENDING' ? 'در انتظار' : 'رد شده'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          </>
        ) : null}
      </main>

      {confirmState && (
        <ConfirmModal
          message={
            confirmState.action === 'approve'
              ? `آیا «${confirmState.member.fullName}» را تأیید می‌کنید؟`
                + (confirmState.member.role === 'STUDENT'
                  ? (confirmState.member.pendingAdvisor
                    ? ` مشاورِ انتخابی او: «${confirmState.member.pendingAdvisor.fullName}» — بعد از تأیید همین اتصال فعال می‌شود.`
                    : ' این دانش‌آموز هنوز مشاور انتخاب نکرده؛ بعداً از بخش دانش‌آموزان می‌توانید برایش مشاور تعیین کنید.')
                  : '')
              : confirmState.action === 'reject'
                ? `درخواست عضویت «${confirmState.member.fullName}» رد شود؟ (بعداً قابل تأیید مجدد است)`
                : `«${confirmState.member.fullName}» از مؤسسه حذف شود؟ او به حساب مستقل تبدیل می‌شود ولی حسابش پاک نمی‌شود.`
          }
          confirmText={confirmState.action === 'approve' ? '✓ تأیید' : confirmState.action === 'reject' ? '✗ رد' : '🗑 حذف از مؤسسه'}
          danger={confirmState.action !== 'approve'}
          onConfirm={confirmState.action === 'remove' ? handleRemoveMember : handleDecision}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* مودال انتخاب/تغییر مشاور دانش‌آموز */}
      {advisorPicker && (
        <div className="modal-overlay" onClick={() => setAdvisorPicker(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3>🎓 مشاور «{advisorPicker.student.fullName}»</h3>
              <button className="btn-icon-only" onClick={() => setAdvisorPicker(null)} aria-label="بستن">✕</button>
            </div>
            <div className="profile-form">
              <p className="muted-text" style={{ margin: '0 0 8px', fontSize: 13 }}>
                یکی از مشاوران فعال مؤسسه را انتخاب کنید. با تغییر مشاور، اتصال قبلی این دانش‌آموز بسته می‌شود.
              </p>
              <label className="field-label">
                مشاور
                <select
                  value={advisorPicker.advisorId}
                  onChange={(e) => setAdvisorPicker({ ...advisorPicker, advisorId: e.target.value })}
                >
                  <option value="">— انتخاب مشاور —</option>
                  {activeAdvisors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName} ({toFaDigits(a.students.length)} دانش‌آموز)
                    </option>
                  ))}
                </select>
                {activeAdvisors.length === 0 && (
                  <span className="field-hint">هیچ مشاور فعالی در مؤسسه نیست؛ اول یک مشاور تأیید/اضافه کنید.</span>
                )}
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveAdvisor}>✓ ذخیره</button>
                <button className="btn-secondary" onClick={() => setAdvisorPicker(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, onDecide }) {
  return (
    <div className="institute-member-row">
      <span className="advisor-avatar">
        {member.photoUrl ? <img src={member.photoUrl} alt="" className="avatar-photo" /> : member.fullName?.[0] || '؟'}
      </span>
      <div className="institute-advisor-info">
        <strong>{member.fullName}</strong>
        <small dir="ltr">{member.email}</small>
        {member.phone && <small dir="ltr">📞 {member.phone}</small>}
        {member.bio && <small className="muted-text">{member.bio.slice(0, 80)}{member.bio.length > 80 ? '…' : ''}</small>}
      </div>
      <div className="institute-member-actions">
        <button className="btn-primary btn-sm" onClick={() => onDecide('approve')}>
          {member.status === 'REJECTED' ? 'تأیید مجدد' : 'تأیید'}
        </button>
        {member.status === 'PENDING' && (
          <button className="btn-secondary btn-sm" onClick={() => onDecide('reject')}>
            رد
          </button>
        )}
      </div>
    </div>
  );
}
