import { useState } from 'react';
import Ico from '../Ico';
import { toFaDigits } from '../../utils/jalali';

const ALL_FIELDS = [
  { value: 'HUMANITIES', label: 'علوم انسانی', emoji: '📚' },
  { value: 'MATH_PHYSICS', label: 'ریاضی و فیزیک', emoji: '📐' },
  { value: 'EXPERIMENTAL', label: 'علوم تجربی', emoji: '🧪' },
];

export default function AdminStudentsSection({
  students,
  userSubLabel,
  setEditingUserSub,
  setEditingPrice,
  setOtpTarget,
  handleDeactivateStudent,
  handleReactivateStudent,
  handleDeleteStudent,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.fullName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.advisor?.fullName || '').toLowerCase().includes(q)
    );
  });

  return (
    <section className="card admin-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <span aria-hidden><Ico e="🎒" /></span> نمای کلی دانش‌آموزان ({toFaDigits(students.length)})
        </h3>

        {students.length > 3 && (
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام، تلفن، ایمیل یا مشاور…"
            style={{ maxWidth: 260, fontSize: 13, padding: '6px 12px' }}
          />
        )}
      </div>

      {students.length === 0 && (
        <div className="empty-card small">
          <span className="empty-emoji" aria-hidden><Ico e="🎒" /></span>
          <p>هنوز دانش‌آموزی ثبت‌نام نکرده است.</p>
        </div>
      )}

      {students.length > 0 && filtered.length === 0 && (
        <p className="muted-text" style={{ textAlign: 'center', margin: '20px 0' }}>
          دانش‌آموزی با این مشخصات یافت نشد.
        </p>
      )}

      <div className="overview-list">
        {filtered.map((student) => (
          <div key={student.id} className="overview-row">
            <div
              className="overview-head"
              onClick={() => setExpandedId(expandedId === student.id ? null : student.id)}
            >
              <div className="overview-advisor">
                <div className="overview-avatar">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" className="avatar-photo" />
                  ) : (
                    (student.fullName || '؟').charAt(0)
                  )}
                </div>
                <div className="overview-advisor-info">
                  <div className="overview-advisor-name-row">
                    <strong className="overview-advisor-name">{student.fullName || 'بدون نام'}</strong>
                  </div>
                  <span className="muted-text overview-count">
                    {student.advisor
                      ? `مشاور: ${student.advisor.fullName}`
                      : student.pendingAdvisor
                        ? <><Ico e="⏳" /> درخواست به {student.pendingAdvisor.fullName}</>
                        : 'بدون مشاور'}
                    {student.institute && (
                      <span className="advisor-institute-pill"><Ico e="🏫" /> {student.institute.name}</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="overview-contacts">
                <span className={`status-pill ${
                  student.status === 'ACTIVE' ? 'done'
                  : student.status === 'SUSPENDED' ? 'skipped'
                  : student.status === 'PENDING' ? 'pending'
                  : 'skipped'
                }`}>
                  {student.status === 'ACTIVE' ? <><Ico e="✓" /> فعال</>
                   : student.status === 'SUSPENDED' ? <><Ico e="⏸" /> غیرفعال</>
                   : student.status === 'PENDING' ? <><Ico e="⏳" /> در انتظار</>
                   : <><Ico e="✕" /> رد شده</>}
                </span>
                <span className="chevron">{expandedId === student.id ? '▾' : '▸'}</span>
              </div>
            </div>

            {expandedId === student.id && (
              <div className="overview-detail">
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="📧" /> ایمیل:</span>
                  <a href={`mailto:${student.email}`} dir="ltr">{student.email}</a>
                </div>
                {student.phone && (
                  <div className="overview-bio-row">
                    <span className="muted-text"><Ico e="📞" /> تماس:</span>
                    <a href={`tel:${student.phone}`} dir="ltr">{toFaDigits(student.phone)}</a>
                  </div>
                )}
                {student.bio && (
                  <div className="overview-bio-row">
                    <span className="muted-text"><Ico e="📝" /> توضیحات:</span>
                    <span>{student.bio}</span>
                  </div>
                )}
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="🎓" /> رشته:</span>
                  <span>
                    {student.field
                      ? (ALL_FIELDS.find((x) => x.value === student.field)?.label || student.field)
                      : '—'}
                  </span>
                </div>
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="🚪" /> نحوه‌ی ورود:</span>
                  <span>
                    {student.signupSource === 'ADVISOR_LINK'
                      ? <>لینک دعوت مشاور{student.signupInviter ? ` «${student.signupInviter.fullName}»` : ''}</>
                      : student.signupSource === 'FRIEND_LINK'
                        ? <>لینک دعوت دوست{student.signupInviter ? ` «${student.signupInviter.fullName}»` : ''}</>
                        : student.signupSource === 'DIRECT'
                          ? 'ثبت‌نام عادی (انتخاب مشاور توسط خودش)'
                          : 'نامشخص (حساب قدیمی)'}
                  </span>
                </div>
                {(student.referral || student.discountPercent > 0) && (
                  <div className="overview-bio-row">
                    <span className="muted-text"><Ico e="🎁" /> تخفیف دعوت:</span>
                    <span>
                      {student.discountPercent > 0 ? `${toFaDigits(student.discountPercent)}٪ فعال` : 'فعال نیست'}
                      {student.referral?.status === 'PENDING' ? ` — منتظر اولین پرداخت (قرعه: ${toFaDigits(student.referral.drawnPercent)}٪)` : ''}
                    </span>
                  </div>
                )}
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="🏫" /> مؤسسه:</span>
                  <span>{student.institute ? student.institute.name : 'مستقل'}</span>
                </div>
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="📅" /> اشتراک فردی:</span>
                  <span className={`status-pill ${userSubLabel(student.subscription).cls}`}>
                    {userSubLabel(student.subscription).text}
                  </span>
                  <button
                    className="btn-secondary btn-xs"
                    onClick={() => setEditingUserSub({
                      userId: student.id,
                      name: student.fullName,
                      daysFromNow: 30,
                      status: student.subscription?.status || 'ACTIVE',
                    })}
                    title="تنظیم اشتراک فردی این دانش‌آموز"
                    type="button"
                  >
                    <Ico e="⏳" /> اشتراک
                  </button>
                  <button
                    className="btn-secondary btn-xs"
                    onClick={() => setEditingPrice({
                      kind: 'USER',
                      id: student.id,
                      name: student.fullName,
                      price: student.monthlyPrice != null ? String(student.monthlyPrice) : '',
                    })}
                    title="مبلغ ماهانه"
                    type="button"
                  >
                    <Ico e="💰" /> مبلغ ماهانه
                  </button>
                </div>
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="👥" /> مشاور:</span>
                  <span>
                    {student.advisor
                      ? `${student.advisor.fullName} (فعال)`
                      : student.pendingAdvisor
                        ? `${student.pendingAdvisor.fullName} (در انتظار تأیید)`
                        : 'بدون مشاور'}
                  </span>
                </div>

                <div className="overview-admin-actions">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setOtpTarget({ id: student.id, name: student.fullName })}
                    title="ساخت رمز یک‌بار مصرف"
                    type="button"
                  >
                    <Ico e="🔑" /> OTP
                  </button>
                  {student.status === 'ACTIVE' && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => handleDeactivateStudent(student)}
                      title="غیرفعال‌کردن دانش‌آموز"
                      type="button"
                    >
                      <Ico e="⏸" /> غیرفعال
                    </button>
                  )}
                  {student.status === 'SUSPENDED' && (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleReactivateStudent(student)}
                      type="button"
                    >
                      <Ico e="✓" /> فعال‌کردن
                    </button>
                  )}
                  <button
                    className="btn-secondary btn-sm btn-danger"
                    onClick={() => handleDeleteStudent(student)}
                    title="حذف دانش‌آموز (غیرقابل بازگشت)"
                    type="button"
                  >
                    <Ico e="🗑" /> حذف
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

