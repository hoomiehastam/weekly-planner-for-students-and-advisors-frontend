import { useState } from 'react';
import Ico from '../Ico';
import { toFaDigits } from '../../utils/jalali';

const ALL_FIELDS = [
  { value: 'HUMANITIES', label: 'علوم انسانی', emoji: '📚' },
  { value: 'MATH_PHYSICS', label: 'ریاضی و فیزیک', emoji: '📐' },
  { value: 'EXPERIMENTAL', label: 'علوم تجربی', emoji: '🧪' },
];

export default function AdminAdvisorsSection({
  overview,
  userSubLabel,
  setEditingUserSub,
  setEditingPrice,
  setEditingAdvisorLimit,
  setAssigningAdvisor,
  setEditingFields,
  setOtpTarget,
  handleDeactivateAdvisor,
  handleReactivateAdvisor,
  handleDeleteAdvisor,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = overview.filter((adv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (adv.fullName || '').toLowerCase().includes(q) ||
      (adv.email || '').toLowerCase().includes(q) ||
      (adv.phone || '').includes(q) ||
      (adv.institute?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <section className="card admin-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <span aria-hidden><Ico e="👥" /></span> نمای کلی مشاوران فعال ({toFaDigits(overview.length)})
        </h3>

        {overview.length > 3 && (
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی مشاور، تلفن، ایمیل یا مؤسسه…"
            style={{ maxWidth: 260, fontSize: 13, padding: '6px 12px' }}
          />
        )}
      </div>

      {overview.length === 0 && (
        <div className="empty-card small">
          <span className="empty-emoji" aria-hidden><Ico e="👥" /></span>
          <p>هنوز مشاور فعالی وجود ندارد.</p>
        </div>
      )}

      {overview.length > 0 && filtered.length === 0 && (
        <p className="muted-text" style={{ textAlign: 'center', margin: '20px 0' }}>
          مشاوری با این مشخصات یافت نشد.
        </p>
      )}

      <div className="overview-list">
        {filtered.map((advisor) => (
          <div key={advisor.id} className="overview-row">
            <div
              className="overview-head"
              onClick={() => setExpandedId(expandedId === advisor.id ? null : advisor.id)}
            >
              <div className="overview-advisor">
                <div className="overview-avatar">
                  {(advisor.fullName || '؟').charAt(0)}
                </div>
                <div className="overview-advisor-info">
                  <div className="overview-advisor-name-row">
                    <strong className="overview-advisor-name">
                      {advisor.fullName || 'بدون نام'}
                    </strong>
                    {advisor.role === 'SUPERADMIN' && (
                      <span className="superadmin-pill" title="این حساب مدیر ارشد پلتفرم است">
                        <Ico e="👑" /> مدیر ارشد
                      </span>
                    )}
                  </div>
                  <span className="muted-text overview-count">
                    {toFaDigits(advisor.asAdvisorLinks.length)} دانش‌آموز
                    {advisor.institute && (
                      <span className="advisor-institute-pill"><Ico e="🏫" /> {advisor.institute.name}</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="overview-contacts">
                {advisor.phone && (
                  <a
                    href={`tel:${advisor.phone}`}
                    className="contact-pill"
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                    title={`تماس با ${advisor.fullName}`}
                  >
                    <Ico e="📞" /> {toFaDigits(advisor.phone)}
                  </a>
                )}
                <span className="chevron">{expandedId === advisor.id ? '▾' : '▸'}</span>
              </div>
            </div>

            {expandedId === advisor.id && (
              <div className="overview-detail">
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="📧" /> ایمیل:</span>
                  <a href={`mailto:${advisor.email}`} dir="ltr">{advisor.email}</a>
                </div>
                {advisor.bio && (
                  <div className="overview-bio-row">
                    <span className="muted-text"><Ico e="📝" /> توضیحات:</span>
                    <span>{advisor.bio}</span>
                  </div>
                )}
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="🏫" /> مؤسسه:</span>
                  <span>{advisor.institute ? advisor.institute.name : 'مستقل'}</span>
                </div>
                {advisor.role !== 'SUPERADMIN' && (
                  <div className="overview-bio-row">
                    <span className="muted-text"><Ico e="🎒" /> دانش‌آموز فعال:</span>
                    <span className={`status-pill ${advisor.overLimit ? 'skipped' : advisor.atLimit ? 'pending' : 'done'}`}>
                      {toFaDigits(advisor.activeStudentCount ?? 0)}
                      {advisor.institute
                        ? ' (سقف با آموزشگاه)'
                        : advisor.maxActiveStudents != null
                          ? ` از ${toFaDigits(advisor.maxActiveStudents)}${advisor.overLimit ? ' — بیش از سقف' : advisor.atLimit ? ' — پر' : ''}`
                          : ' (بدون سقف)'}
                    </span>
                    {!advisor.institute && (
                      <button
                        className="btn-secondary btn-xs"
                        onClick={() => setEditingAdvisorLimit({
                          advisorId: advisor.id,
                          name: advisor.fullName,
                          value: advisor.maxActiveStudents ?? '',
                          count: advisor.activeStudentCount ?? 0,
                        })}
                        title="سقف دانش‌آموز فعال این مشاور — خالی یعنی بدون سقف"
                        type="button"
                      >
                        <Ico e="🚧" /> سقف
                      </button>
                    )}
                  </div>
                )}
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="📅" /> اشتراک فردی:</span>
                  <span className={`status-pill ${userSubLabel(advisor.subscription).cls}`}>
                    {userSubLabel(advisor.subscription).text}
                  </span>
                  {advisor.role !== 'SUPERADMIN' && (
                    <button
                      className="btn-secondary btn-xs"
                      onClick={() => setEditingUserSub({
                        userId: advisor.id,
                        name: advisor.fullName,
                        daysFromNow: 30,
                        status: advisor.subscription?.status || 'ACTIVE',
                      })}
                      title="تنظیم اشتراک فردی این مشاور"
                      type="button"
                    >
                      <Ico e="⏳" /> اشتراک
                    </button>
                  )}
                  {advisor.role !== 'SUPERADMIN' && (
                    <button
                      className="btn-secondary btn-xs"
                      onClick={() => setEditingPrice({
                        kind: 'USER',
                        id: advisor.id,
                        name: advisor.fullName,
                        price: advisor.monthlyPrice != null ? String(advisor.monthlyPrice) : '',
                      })}
                      title="مبلغ ماهانه"
                      type="button"
                    >
                      <Ico e="💰" /> مبلغ ماهانه
                    </button>
                  )}
                </div>
                <div className="overview-bio-row">
                  <span className="muted-text"><Ico e="📊" /> وضعیت:</span>
                  <span className={`status-pill ${
                    advisor.status === 'ACTIVE' ? 'done'
                    : advisor.status === 'SUSPENDED' ? 'skipped'
                    : advisor.status === 'PENDING' ? 'pending'
                    : 'skipped'
                  }`}>
                    {advisor.status === 'ACTIVE' ? <><Ico e="✓" /> فعال</>
                     : advisor.status === 'SUSPENDED' ? <><Ico e="⏸" /> غیرفعال</>
                     : advisor.status === 'PENDING' ? <><Ico e="⏳" /> در انتظار تأیید</>
                     : <><Ico e="✕" /> رد شده</>}
                  </span>
                </div>
                {advisor.fields && advisor.fields.length > 0 && (
                  <div className="overview-bio-row">
                    <span className="muted-text"><Ico e="🎓" /> رشته‌های تخصص:</span>
                    <div className="advisor-pick-fields">
                      {advisor.fields.map((f) => {
                        const fieldInfo = ALL_FIELDS.find((x) => x.value === f);
                        return (
                          <span
                            key={f}
                            className={`advisor-pick-field field-pill-${f.toLowerCase().replace('_', '-')}`}
                          >
                            {fieldInfo?.emoji} {fieldInfo?.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="overview-admin-actions">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setAssigningAdvisor({
                      advisorId: advisor.id,
                      advisorName: advisor.fullName,
                      currentInstituteId: advisor.institute?.id || null,
                      selectedInstituteId: advisor.institute?.id || '',
                    })}
                    type="button"
                  >
                    <Ico e="🏫" /> تخصیص به مؤسسه
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setEditingFields({
                      advisorId: advisor.id,
                      advisorName: advisor.fullName,
                      selectedFields: advisor.fields || [],
                    })}
                    title="ویرایش رشته‌های تخصص"
                    type="button"
                  >
                    <Ico e="🎓" /> رشته‌های تخصص
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setOtpTarget({ id: advisor.id, name: advisor.fullName })}
                    title="ساخت رمز یک‌بار مصرف"
                    type="button"
                  >
                    <Ico e="🔑" /> OTP
                  </button>
                  {advisor.role !== 'SUPERADMIN' && advisor.status === 'ACTIVE' && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => handleDeactivateAdvisor(advisor)}
                      title="غیرفعال‌کردن مشاور"
                      type="button"
                    >
                      <Ico e="⏸" /> غیرفعال
                    </button>
                  )}
                  {advisor.role !== 'SUPERADMIN' && advisor.status === 'SUSPENDED' && (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleReactivateAdvisor(advisor)}
                      title="فعال‌کردن مجدد"
                      type="button"
                    >
                      <Ico e="✓" /> فعال‌کردن
                    </button>
                  )}
                  {advisor.role !== 'SUPERADMIN' && (
                    <button
                      className="btn-secondary btn-sm btn-danger"
                      onClick={() => handleDeleteAdvisor(advisor)}
                      title="حذف مشاور (غیرقابل بازگشت)"
                      type="button"
                    >
                      <Ico e="🗑" /> حذف
                    </button>
                  )}
                </div>

                <div className="overview-students">
                  <div className="overview-students-title">دانش‌آموزها:</div>
                  {advisor.asAdvisorLinks.length === 0 && (
                    <p className="muted-text">هنوز دانش‌آموزی ندارد.</p>
                  )}
                  {advisor.asAdvisorLinks.map((link) => (
                    <div key={link.student.id} className="overview-student">
                      <span className="student-bullet">—</span>
                      <div className="student-info">
                        <strong>{link.student.fullName}</strong>
                        <div className="student-contacts">
                          <a href={`mailto:${link.student.email}`} dir="ltr">
                            <Ico e="📧" /> {link.student.email}
                          </a>
                          {link.student.phone && (
                            <a href={`tel:${link.student.phone}`} dir="ltr">
                              <Ico e="📞" /> {toFaDigits(link.student.phone)}
                            </a>
                          )}
                          <button
                            className="btn-secondary btn-xs"
                            onClick={() => setOtpTarget({ id: link.student.id, name: link.student.fullName })}
                            title="رمز یک‌بار مصرف"
                            type="button"
                          >
                            <Ico e="🔑" /> OTP
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

