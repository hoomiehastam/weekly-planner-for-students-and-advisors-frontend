import ConfirmModal from '../ConfirmModal';
import FaNumberInput from '../FaNumberInput';
import Ico from '../Ico';
import { toFaDigits } from '../../utils/jalali';

const ALL_FIELDS = [
  { value: 'HUMANITIES', label: 'علوم انسانی', emoji: '📚' },
  { value: 'MATH_PHYSICS', label: 'ریاضی و فیزیک', emoji: '📐' },
  { value: 'EXPERIMENTAL', label: 'علوم تجربی', emoji: '🧪' },
];

export default function AdminModals({
  confirmState,
  setConfirmState,
  editingSub,
  setEditingSub,
  handleSaveSubscription,
  editingUserSub,
  setEditingUserSub,
  handleSaveUserSubscription,
  assigningAdvisor,
  setAssigningAdvisor,
  institutes,
  handleAssignAdvisor,
  editingFields,
  setEditingFields,
  handleSaveFields,
  editingLeader,
  setEditingLeader,
  overview,
  students,
  handleSaveLeader,
  otpTarget,
  setOtpTarget,
  handleCreateOtp,
  otpResult,
  setOtpResult,
  editingLimits,
  setEditingLimits,
  handleSaveLimits,
  editingAdvisorLimit,
  setEditingAdvisorLimit,
  handleSaveAdvisorLimit,
  editingPrice,
  setEditingPrice,
  handleSavePrice,
  editingCard,
  setEditingCard,
  handleSaveCard,
  toast,
}) {
  return (
    <>
      {/* مودال تأیید */}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* مودال ویرایش اشتراک مؤسسه */}
      {editingSub && (
        <div className="modal-overlay" onClick={() => setEditingSub(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="⏳" /> تنظیم اشتراک — {editingSub.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingSub(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <div className="profile-form">
              <label className="field-label">
                تعداد روز تمدید از الان
                <FaNumberInput
                  value={editingSub.daysFromNow}
                  onChange={(v) => setEditingSub({ ...editingSub, daysFromNow: v })}
                  placeholder="مثلاً ۳۰"
                />
                <span className="field-hint">مثلاً ۳۰ = یک ماه، ۹۰ = سه ماه</span>
              </label>
              <label className="field-label">
                وضعیت اشتراک
                <select
                  value={editingSub.status}
                  onChange={(e) => setEditingSub({ ...editingSub, status: e.target.value })}
                >
                  <option value="ACTIVE">فعال (ACTIVE)</option>
                  <option value="TRIAL">آزمایشی (TRIAL)</option>
                  <option value="GRACE">مهلت تمدید (GRACE)</option>
                  <option value="EXPIRED">منقضی (EXPIRED)</option>
                </select>
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveSubscription}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingSub(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال تخصیص مشاور به مؤسسه */}
      {assigningAdvisor && (
        <div className="modal-overlay" onClick={() => setAssigningAdvisor(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="🏫" /> تخصیص مشاور به مؤسسه</h3>
              <button className="btn-icon-only" onClick={() => setAssigningAdvisor(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <p className="muted-text" style={{ marginBottom: 12 }}>
              مشاور «{assigningAdvisor.advisorName}» را به مؤسسه‌ی دلخواه تخصیص بده.
              فقط دانش‌آموزان همان مؤسسه می‌توانند او را انتخاب کنند.
            </p>
            <div className="profile-form">
              <label className="field-label">
                مؤسسه
                <select
                  value={assigningAdvisor.selectedInstituteId || ''}
                  onChange={(e) => setAssigningAdvisor({
                    ...assigningAdvisor,
                    selectedInstituteId: e.target.value,
                  })}
                >
                  <option value="">— مستقل (بدون مؤسسه) —</option>
                  {institutes
                    .filter((i) => i.status === 'ACTIVE')
                    .map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                </select>
                <span className="field-hint">
                  اگر «مستقل» را انتخاب کنی، مشاور از هر مؤسسه‌ای جدا می‌شود.
                </span>
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleAssignAdvisor}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setAssigningAdvisor(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال ویرایش رشته‌های تخصص مشاور */}
      {editingFields && (
        <div className="modal-overlay" onClick={() => setEditingFields(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="profile-modal-head">
              <h3><Ico e="🎓" /> رشته‌های تخصص مشاور</h3>
              <button className="btn-icon-only" onClick={() => setEditingFields(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <p className="muted-text" style={{ marginBottom: 12 }}>
              مشاور «{editingFields.advisorName}» در کدام رشته‌ها تخصص دارد؟
              دانش‌آموزان فقط در صورتی می‌توانند این مشاور را انتخاب کنند که رشته‌ی آن‌ها در این لیست باشد.
              می‌توانید چند رشته انتخاب کنید.
            </p>
            <div className="profile-form">
              <div className="field-label">
                رشته‌های تخصص
                <div className="field-picker">
                  {ALL_FIELDS.map((f) => {
                    const isSelected = editingFields.selectedFields.includes(f.value);
                    return (
                      <button
                        key={f.value}
                        type="button"
                        className={`field-card field-card-${
                          f.value === 'HUMANITIES' ? 'amber'
                          : f.value === 'MATH_PHYSICS' ? 'indigo'
                          : 'sage'
                        } ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setEditingFields((prev) => ({
                            ...prev,
                            selectedFields: isSelected
                              ? prev.selectedFields.filter((v) => v !== f.value)
                              : [...prev.selectedFields, f.value],
                          }));
                        }}
                      >
                        <span className="field-emoji" aria-hidden><Ico e={f.emoji} /></span>
                        <span className="field-name">{f.label}</span>
                        {isSelected && <span className="field-check" aria-hidden><Ico e="✓" /></span>}
                      </button>
                    );
                  })}
                </div>
                <span className="field-hint">
                  {editingFields.selectedFields.length === 0
                    ? <><Ico e="⚠️" /> حداقل یک رشته باید انتخاب باشد، وگرنه هیچ دانش‌آموزی نمی‌تواند این مشاور را انتخاب کند.</>
                    : `${toFaDigits(editingFields.selectedFields.length)} رشته انتخاب شده`}
                </span>
              </div>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveFields}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingFields(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال تعیین نماینده‌ی مؤسسه */}
      {editingLeader && (
        <div className="modal-overlay" onClick={() => setEditingLeader(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="profile-modal-head">
              <h3><Ico e="👤" /> نماینده‌ی مؤسسه</h3>
              <button className="btn-icon-only" onClick={() => setEditingLeader(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <p className="muted-text" style={{ marginBottom: 12 }}>
              یکی از اعضای فعال «{editingLeader.instituteName}» را به‌عنوان نماینده تعیین کن.
              نماینده می‌تواند اعضای جدید را تأیید/رد کند، فهرست دانش‌آموزان و مشاوران را ببیند
              و عضو متخلف را از مؤسسه حذف کند — بدون اینکه نقشش تغییر کند.
            </p>
            <div className="profile-form">
              <label className="field-label">
                نماینده‌ی مؤسسه
                <select
                  value={editingLeader.leaderId || ''}
                  onChange={(e) => setEditingLeader({ ...editingLeader, leaderId: e.target.value })}
                >
                  <option value="">— بدون نماینده —</option>
                  {overview
                    .filter((a) => a.institute?.id === editingLeader.instituteId && a.status === 'ACTIVE')
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.fullName}</option>
                    ))}
                  {students
                    .filter((s) => s.institute?.id === editingLeader.instituteId && s.status === 'ACTIVE')
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName} (دانش‌آموز)</option>
                    ))}
                </select>
                <span className="field-hint">
                  «بدون نماینده» یعنی عزل نماینده‌ی فعلی — تأیید اعضا به سوپرادمین برمی‌گردد.
                </span>
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveLeader}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingLeader(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال تأیید ساخت OTP */}
      {otpTarget && (
        <div className="modal-overlay" onClick={() => setOtpTarget(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="🔑" /> ساخت رمز یک‌بار مصرف</h3>
              <button className="btn-icon-only" onClick={() => setOtpTarget(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <p style={{ lineHeight: 1.8 }}>
              برای کاربر «{otpTarget.name}» یک رمز یک‌بار مصرف ساخته می‌شود.
              این رمز به‌صورت خودکار به ایمیل کاربر ارسال می‌شود؛ اگر SMTP تنظیم نباشد،
              باید دستی به او بدهید. کاربر با ایمیل و این رمز وارد می‌شود
              و بعد از ورود باید رمز عبور جدیدی تعیین کند.
            </p>
            <div className="profile-form-actions">
              <button className="btn-primary" onClick={handleCreateOtp}><Ico e="🔑" /> ساخت OTP</button>
              <button className="btn-secondary" onClick={() => setOtpTarget(null)}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* نمایش OTP ساخته‌شده */}
      {otpResult && (
        <div className="modal-overlay" onClick={() => setOtpResult(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="profile-modal-head">
              <h3><Ico e="✅" /> رمز یک‌بار مصرف ساخته شد</h3>
              <button className="btn-icon-only" onClick={() => setOtpResult(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <p className="muted-text" style={{ marginBottom: 12 }}>
              {otpResult.emailed
                ? 'این رمز به‌صورت خودکار به ایمیل کاربر ارسال شد.'
                : <><Ico e="⚠" /> ارسال خودکار ایمیل انجام نشد (SMTP تنظیم نیست)؛ این رمز را دستی به کاربر بدهید.</>}
              {' '}طول عمر آن {toFaDigits(otpResult.ttlHours)} ساعت است و فقط یک بار قابل استفاده است.
            </p>
            <div className="otp-result-box" dir="ltr">
              {otpResult.otp}
            </div>
            <p className="muted-text" style={{ marginTop: 12, fontSize: 12 }}>
              <Ico e="💡" /> کاربر باید با ایمیل خود و این رمز وارد شود و سپس رمز جدیدی تعیین کند.
            </p>
            <div className="profile-form-actions">
              <button className="btn-primary" onClick={() => {
                navigator.clipboard?.writeText(otpResult.otp);
                toast.success('کپی شد');
              }}><Ico e="📋" /> کپی رمز</button>
              <button className="btn-secondary" onClick={() => setOtpResult(null)}>بستن</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال اشتراک فردی کاربر (مشاور/دانش‌آموز) */}
      {editingUserSub && (
        <div className="modal-overlay" onClick={() => setEditingUserSub(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="⏳" /> اشتراک فردی — {editingUserSub.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingUserSub(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <div className="profile-form">
              <p className="muted-text" style={{ margin: '0 0 8px', fontSize: 13 }}>
                کاربر عضو مؤسسه هم که باشد، این اشتراک فردی مستقل از اشتراک مؤسسه کار می‌کند
                (هرکدام که دیرتر تمام شود دسترسی می‌دهد).
              </p>
              <label className="field-label">
                تعداد روز تمدید از الان
                <FaNumberInput
                  value={editingUserSub.daysFromNow}
                  onChange={(v) => setEditingUserSub({ ...editingUserSub, daysFromNow: v })}
                  placeholder="مثلاً ۳۰"
                />
                <span className="field-hint">مثلاً ۳۰ = یک ماه، ۹۰ = سه ماه</span>
              </label>
              <label className="field-label">
                وضعیت اشتراک
                <select
                  value={editingUserSub.status}
                  onChange={(e) => setEditingUserSub({ ...editingUserSub, status: e.target.value })}
                >
                  <option value="ACTIVE">فعال (ACTIVE)</option>
                  <option value="TRIAL">آزمایشی (TRIAL)</option>
                  <option value="GRACE">مهلت تمدید (GRACE)</option>
                  <option value="EXPIRED">منقضی (EXPIRED)</option>
                </select>
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveUserSubscription}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingUserSub(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال مبلغ ماهانه (کاربر یا مؤسسه) */}
      {editingPrice && (
        <div className="modal-overlay" onClick={() => setEditingPrice(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="💰" /> مبلغ ماهانه — {editingPrice.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingPrice(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <div className="profile-form">
              <p className="muted-text" style={{ margin: '0 0 8px', fontSize: 13 }}>
                {editingPrice.kind === 'USER'
                  ? 'این مبلغ در صفحه‌ی واریزِ این کاربر نمایش داده می‌شود و با تأیید رسید، تعداد روزهای تمدید خودکار از آن محاسبه می‌شود (مبلغ ÷ قیمت ماهانه × ۳۰ روز).'
                  : 'این مبلغ در صفحه‌ی واریز مدیر مؤسسه نمایش داده می‌شود و با تأیید رسید، روزهای تمدید خودکار از آن محاسبه می‌شود (مبلغ ÷ قیمت ماهانه × ۳۰ روز).'}
                خالی گذاشتن یعنی بدون قیمت — در این حالت مدت تمدید دستی تعیین می‌شود.
              </p>
              <label className="field-label">
                مبلغ ماهانه (تومان)
                <FaNumberInput
                  value={editingPrice.price}
                  onChange={(v) => setEditingPrice({ ...editingPrice, price: v })}
                  placeholder="مثلاً ۵۰۰٬۰۰۰"
                  grouping
                  autoFocus
                />
                {editingPrice.price && (
                  <span className="field-hint">
                    هر مبلغ کامل این‌حرفی یک ماه تمدید می‌دهد؛ مثلاً نصف این مبلغ = ۱۵ روز
                  </span>
                )}
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSavePrice}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingPrice(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال سقف دانش‌آموز مشاور */}
      {editingAdvisorLimit && (
        <div className="modal-overlay" onClick={() => setEditingAdvisorLimit(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="🚧" /> سقف دانش‌آموز — {editingAdvisorLimit.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingAdvisorLimit(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <div className="profile-form">
              <p className="muted-text" style={{ margin: '0 0 8px', fontSize: 13 }}>
                «دانش‌آموز فعال» یعنی حساب فعال + اتصال فعال به این مشاور + اشتراک معتبر. وقتی تعداد به سقف برسد،
                ثبت‌نام با لینک دعوت و قبول درخواست جدید رد می‌شود. دانش‌آموزان فعلی هرگز قطع نمی‌شوند.
                الان {toFaDigits(editingAdvisorLimit.count)} دانش‌آموز فعال دارد. خالی گذاشتن یعنی بدون سقف.
              </p>
              <label className="field-label">
                سقف دانش‌آموز فعال
                <FaNumberInput
                  value={editingAdvisorLimit.value}
                  onChange={(v) => setEditingAdvisorLimit({ ...editingAdvisorLimit, value: v })}
                  placeholder="مثلاً ۳۰"
                />
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveAdvisorLimit}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingAdvisorLimit(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال سقف اعضای مؤسسه */}
      {editingLimits && (
        <div className="modal-overlay" onClick={() => setEditingLimits(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="🚧" /> سقف اعضا — {editingLimits.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingLimits(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <div className="profile-form">
              <p className="muted-text" style={{ margin: '0 0 8px', fontSize: 13 }}>
                وقتی تعداد اعضا به سقف برسد، عضو جدید پذیرفته نمی‌شود و پیام «اشتراک را ارتقا دهید» نمایش داده می‌شود.
                خالی گذاشتن یعنی بی‌نهایت. «دانش‌آموز فعال» یعنی حساب فعال + اتصال فعال به مشاور + اشتراک معتبر؛
                کاهش سقف به کمتر از تعداد فعلی دانش‌آموزان را قطع نمی‌کند و فقط ورودی جدید را می‌بندد.
              </p>
              <label className="field-label">
                سقف مشاوران (خالی = بی‌نهایت)
                <FaNumberInput
                  value={editingLimits.maxAdvisors}
                  onChange={(v) => setEditingLimits({ ...editingLimits, maxAdvisors: v })}
                  placeholder="مثلاً ۵"
                />
              </label>
              <label className="field-label">
                سقف دانش‌آموزان (خالی = بی‌نهایت)
                <FaNumberInput
                  value={editingLimits.maxStudents}
                  onChange={(v) => setEditingLimits({ ...editingLimits, maxStudents: v })}
                  placeholder="مثلاً ۵۰"
                />
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveLimits}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingLimits(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال کارت واریز (مؤسسه یا پلتفرم) */}
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3><Ico e="💳" /> {editingCard.title}</h3>
              <button className="btn-icon-only" onClick={() => setEditingCard(null)} aria-label="بستن"><Ico e="✕" /></button>
            </div>
            <div className="profile-form">
              <p className="muted-text" style={{ margin: '0 0 8px', fontSize: 13 }}>
                این شماره در صفحه‌ی واریزِ مقصد درست نمایش داده می‌شود:
                {editingCard.kind === 'INSTITUTE'
                  ? ' اعضای مؤسسه (دانش‌آموزان و مشاوران) این کارت را می‌بینند.'
                  : ' مشاوران مستقل، مؤسسه‌ها و مدیران مؤسسه این کارت را می‌بینند.'}
              </p>
              <label className="field-label">
                شماره کارت (۱۶ رقم)
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={editingCard.cardNumber}
                  onChange={(e) => setEditingCard({ ...editingCard, cardNumber: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                />
              </label>
              <label className="field-label">
                نام صاحب کارت (اختیاری)
                <input
                  type="text"
                  value={editingCard.holderName}
                  onChange={(e) => setEditingCard({ ...editingCard, holderName: e.target.value })}
                />
              </label>
              <label className="field-label">
                مبلغ ماهانه (تومان — اختیاری)
                <FaNumberInput
                  value={editingCard.monthlyPrice || ''}
                  onChange={(v) => setEditingCard({ ...editingCard, monthlyPrice: v })}
                  placeholder="مثلاً ۵۰۰٬۰۰۰"
                  grouping
                />
                <span className="field-hint">
                  اگر تعیین شود، واریزکنندگان به این کارت آن را می‌بینند و روزهای تمدید خودکار از آن محاسبه می‌شود
                </span>
              </label>
              <label className="field-label">
                شماره شبا (اختیاری)
                <input
                  type="text"
                  dir="ltr"
                  value={editingCard.shaba}
                  onChange={(e) => setEditingCard({ ...editingCard, shaba: e.target.value })}
                  placeholder="IR"
                />
              </label>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveCard}><Ico e="✓" /> ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingCard(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

