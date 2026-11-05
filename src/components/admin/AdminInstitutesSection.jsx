import { useState } from 'react';
import Ico from '../Ico';
import FaNumberInput from '../FaNumberInput';
import { formatJalaliDate, toFaDigits } from '../../utils/jalali';

export default function AdminInstitutesSection({
  institutes,
  subLabel,
  handleCreateInstitute,
  handleActivateInstitute,
  handleDeleteInstitute,
  handleToggleInstituteReferral,
  setEditingSub,
  setEditingPrice,
  setEditingLeader,
  setEditingLimits,
  setEditingCard,
  createdInstitute,
}) {
  const [showInstituteForm, setShowInstituteForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formManagerName, setFormManagerName] = useState('');
  const [formManagerPhone, setFormManagerPhone] = useState('');
  const [formManagerPassword, setFormManagerPassword] = useState('');
  const [formMonthlyPrice, setFormMonthlyPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLocalError('');
    if (!formName.trim() || formName.trim().length < 2) {
      setLocalError('نام آموزشگاه باید حداقل ۲ کاراکتر باشد');
      return;
    }
    if (!formManagerName.trim() || formManagerName.trim().length < 2) {
      setLocalError('نام و نام خانوادگی مدیر باید حداقل ۲ کاراکتر باشد');
      return;
    }
    if (!formManagerPhone.trim()) {
      setLocalError('شماره همراه مدیر الزامی است');
      return;
    }
    if (!formManagerPassword || formManagerPassword.length < 8) {
      setLocalError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }

    setSubmitting(true);
    try {
      await handleCreateInstitute({
        name: formName.trim(),
        managerName: formManagerName.trim(),
        managerPhone: formManagerPhone.trim(),
        managerPassword: formManagerPassword,
        monthlyPrice: formMonthlyPrice || null,
      });
      setFormName('');
      setFormManagerName('');
      setFormManagerPhone('');
      setFormManagerPassword('');
      setFormMonthlyPrice('');
      setShowInstituteForm(false);
    } catch (err) {
      setLocalError(err.message || 'خطا در ثبت آموزشگاه');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card admin-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <span aria-hidden><Ico e="🏫" /></span> مؤسسه‌های آموزشی ({toFaDigits(institutes.length)})
        </h3>

        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowInstituteForm((s) => !s)}
          type="button"
        >
          {showInstituteForm ? (
            <><Ico e="✕" /> بستن فرم</>
          ) : (
            <><i className="ti ti-plus" aria-hidden="true" /> ثبت مؤسسه‌ی جدید</>
          )}
        </button>
      </div>

      {showInstituteForm && (
        <form className="institute-create-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--sheet-tint, rgba(99, 102, 241, 0.04))', padding: 18, borderRadius: 14, border: '1px solid var(--hairline-soft)', marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            <i className="ti ti-building" aria-hidden="true" /> ایجاد مستقیم آموزشگاه و حساب مدیر
          </h4>
          <p className="muted-text" style={{ margin: 0, fontSize: 13 }}>
            با تکمیل این فرم، آموزشگاه جدید به همراه حساب کاربری مدیر مؤسسه ساخته شده و به یکدیگر متصل می‌شوند.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label className="field-label">
              نام آموزشگاه / مؤسسه
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثلاً آموزشگاه کنکور قلم"
                required
                minLength={2}
              />
            </label>

            <label className="field-label">
              نام و نام خانوادگی مدیر
              <input
                value={formManagerName}
                onChange={(e) => setFormManagerName(e.target.value)}
                placeholder="نام کامل مسئول مؤسسه"
                required
                minLength={2}
              />
            </label>

            <label className="field-label">
              شماره همراه مدیر (نام کاربری ورود)
              <input
                value={formManagerPhone}
                onChange={(e) => setFormManagerPhone(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                inputMode="tel"
                required
              />
            </label>

            <label className="field-label">
              رمز عبور ورود مدیر
              <input
                type="password"
                value={formManagerPassword}
                onChange={(e) => setFormManagerPassword(e.target.value)}
                placeholder="حداقل ۸ کاراکتر"
                dir="ltr"
                required
                minLength={8}
              />
            </label>

            <label className="field-label">
              شهریه ماهانه آموزشگاه (تومان — اختیاری)
              <FaNumberInput
                value={formMonthlyPrice}
                onChange={setFormMonthlyPrice}
                placeholder="مثلاً ۱٬۲۰۰٬۰۰۰"
                grouping
              />
            </label>
          </div>

          {localError && (
            <div className="alert alert-error" style={{ margin: '4px 0' }}>
              <span><Ico e="⚠" /></span> {localError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowInstituteForm(false)}>
              انصراف
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'در حال ایجاد…' : <><Ico e="✓" /> ایجاد آموزشگاه و مدیر</>}
            </button>
          </div>
        </form>
      )}

      {createdInstitute && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <span><Ico e="✓" /></span>
          <div>
            «{createdInstitute.name}» ساخته شد. کد دعوت اعضا:
            <strong className="institute-code-box sm" dir="ltr" style={{ margin: '0 6px' }}>{createdInstitute.code}</strong>
          </div>
        </div>
      )}

      {institutes.length === 0 && (
        <div className="empty-card small">
          <span className="empty-emoji" aria-hidden><Ico e="🏫" /></span>
          <p>هنوز مؤسسه‌ای ثبت نشده است.</p>
        </div>
      )}

      <div className="institute-admin-list">
        {institutes.map((inst) => {
          const sub = subLabel(inst);
          const isPending = inst.status !== 'ACTIVE';
          return (
            <div key={inst.id} className="institute-admin-row institute-admin-row-extended">
              <div className="institute-admin-info">
                <strong>
                  {inst.name}
                  {inst.leader && (
                    <span className="leader-pill" title="مدیر / نماینده‌ی مؤسسه">
                      <Ico e="👤" /> {inst.leader.fullName}
                    </span>
                  )}
                </strong>
                <small className="muted-text">
                  {toFaDigits(inst._count?.members || 0)} عضو · ساخته‌شده {formatJalaliDate(inst.createdAt, { withYear: false })}
                </small>
              </div>

              <span className="institute-code-box sm" dir="ltr" title="کد دعوت">{inst.code}</span>
              <span className={`status-pill ${sub.cls}`}>{sub.text}</span>
              <span className={`status-pill ${isPending ? 'pending' : 'done'}`}>
                {isPending ? 'در انتظار تأیید' : 'فعال و تأییدشده'}
              </span>

              <div className="institute-admin-actions">
                {isPending && (
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => handleActivateInstitute(inst.id)}
                    title="تأیید آموزشگاه و فعال‌سازی دسترسی مدیر"
                  >
                    <Ico e="✓" /> تأیید و فعال‌سازی
                  </button>
                )}
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setEditingSub({
                    instituteId: inst.id,
                    name: inst.name,
                    daysFromNow: 30,
                    status: inst.subscription?.status || 'ACTIVE',
                  })}
                  title="تنظیم مدت اشتراک"
                >
                  <Ico e="⏳" /> اشتراک
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setEditingPrice({
                    kind: 'INSTITUTE',
                    id: inst.id,
                    name: inst.name,
                    price: inst.monthlyPrice != null ? String(inst.monthlyPrice) : '',
                  })}
                  title="مبلغ ماهانه‌ی اشتراک مؤسسه"
                >
                  <Ico e="💰" /> مبلغ ماهانه{inst.monthlyPrice != null ? ` (${toFaDigits(Number(inst.monthlyPrice).toLocaleString('en-US'))})` : ''}
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setEditingLeader({
                    instituteId: inst.id,
                    instituteName: inst.name,
                    leaderId: inst.leader?.id || '',
                  })}
                  title="تعیین نماینده‌ی مؤسسه"
                >
                  <Ico e="👤" /> نماینده
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setEditingLimits({
                    instituteId: inst.id,
                    name: inst.name,
                    maxAdvisors: inst.subscription?.maxAdvisors ?? '',
                    maxStudents: inst.subscription?.maxStudents ?? '',
                  })}
                  title="سقف مشاور/دانش‌آموز مؤسسه"
                >
                  <Ico e="🚧" /> سقف اعضا
                </button>
                <span
                  className={`status-pill ${inst.overLimit ? 'skipped' : inst.atLimit ? 'pending' : 'done'}`}
                  title="دانش‌آموز فعال = حساب فعال + اتصال فعال + اشتراک معتبر"
                >
                  <Ico e="🎒" /> فعال: {toFaDigits(inst.activeStudentCount ?? 0)}
                  {inst.subscription?.maxStudents != null ? ` از ${toFaDigits(inst.subscription.maxStudents)}` : ' (بدون سقف)'}
                  {inst.overLimit ? ' — بیش از سقف' : inst.atLimit ? ' — پر' : ''}
                </span>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => handleToggleInstituteReferral(inst)}
                  title="تخفیف دعوت دوستان برای دانش‌آموزان این آموزشگاه"
                >
                  <Ico e="🎁" /> تخفیف دعوت: {inst.referralEnabled !== false ? 'روشن' : 'خاموش'}
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setEditingCard({
                    kind: 'INSTITUTE',
                    ownerId: inst.id,
                    title: `کارت واریز مؤسسه ${inst.name}`,
                    cardNumber: inst.card?.cardNumber || '',
                    shaba: inst.card?.shaba || '',
                    holderName: inst.card?.holderName || inst.name,
                    monthlyPrice: inst.card?.monthlyPrice != null ? String(inst.card.monthlyPrice) : (inst.monthlyPrice != null ? String(inst.monthlyPrice) : ''),
                  })}
                  title="شماره کارتی که اعضا برای تمدید به آن واریز می‌کنند"
                >
                  <Ico e="💳" /> کارت
                </button>
                <button
                  className="btn-secondary btn-sm btn-danger"
                  onClick={() => handleDeleteInstitute(inst)}
                  title="حذف مؤسسه"
                >
                  <Ico e="🗑" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

