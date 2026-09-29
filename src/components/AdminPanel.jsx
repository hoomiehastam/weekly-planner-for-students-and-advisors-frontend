import { useEffect, useState } from 'react';
import {
  fetchPendingAdvisors,
  approveAdvisor,
  rejectAdvisor,
  fetchAdvisorsOverview,
  fetchStudentsOverview,
  deactivateStudent,
  reactivateStudent,
  deleteStudent,
  fetchInstitutes,
  createInstitute,
  activateInstitute,
  deleteInstitute,
  updateInstituteSubscription,
  assignAdvisorToInstitute,
  assignAdvisorFields,
  setInstituteLeader,
  deactivateAdvisor,
  reactivateAdvisor,
  deleteAdvisor,
  createUserOtp,
  updateUserSubscription,
  updateInstituteLimits,
  setInstituteCard,
  setSystemCard,
  setUserMonthlyPrice,
  setInstituteMonthlyPrice,
  fetchKonkurDate,
  setKonkurDate as saveKonkurDate,
  fetchAuditLogs,
} from '../api/client';
import { formatJalaliDate, toFaDigits } from '../utils/jalali';
import { konkurCountdownText } from '../utils/konkurDate';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';
import FaNumberInput from './FaNumberInput';
import JalaliDatePicker from './JalaliDatePicker';

const ALL_FIELDS = [
  { value: 'HUMANITIES', label: 'علوم انسانی', emoji: '📚' },
  { value: 'MATH_PHYSICS', label: 'ریاضی و فیزیک', emoji: '📐' },
  { value: 'EXPERIMENTAL', label: 'علوم تجربی', emoji: '🧪' },
];

// برچسب خوانای اکشن‌های لاگ ممیزی
const AUDIT_ACTION_LABELS = {
  ADVISOR_APPROVE: 'تأیید مشاور',
  ADVISOR_DEACTIVATE: 'غیرفعال‌سازی مشاور',
  ADVISOR_DELETE: 'حذف مشاور',
  ADVISOR_INSTITUTE_ASSIGN: 'تخصیص مؤسسه',
  STUDENT_DEACTIVATE: 'غیرفعال‌سازی دانش‌آموز',
  STUDENT_DELETE: 'حذف دانش‌آموز',
  USER_SUBSCRIPTION_SET: 'تنظیم اشتراک کاربر',
  USER_MONTHLY_PRICE_SET: 'مبلغ ماهانه‌ی کاربر',
  INSTITUTE_SUBSCRIPTION_SET: 'اشتراک مؤسسه',
  INSTITUTE_LIMITS_SET: 'سقف اعضای مؤسسه',
  INSTITUTE_MONTHLY_PRICE_SET: 'مبلغ ماهانه‌ی مؤسسه',
  INSTITUTE_LEADER_SET: 'تعیین نماینده‌ی مؤسسه',
  OTP_CREATE: 'ساخت رمز یک‌بارمصرف',
  KONKUR_DATE_SET: 'تاریخ کنکور',
};

function auditActionLabel(action) {
  return AUDIT_ACTION_LABELS[action] || action;
}

export default function AdminPanel() {
  const toast = useToast();
  const [pending, setPending] = useState([]);
  const [overview, setOverview] = useState([]);
  const [students, setStudents] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showInstituteForm, setShowInstituteForm] = useState(false);
  const [newInstituteName, setNewInstituteName] = useState('');
  const [createdInstitute, setCreatedInstitute] = useState(null);

  // مدیریت حالت‌های مودال و ویرایش
  const [editingSub, setEditingSub] = useState(null); // { instituteId, daysFromNow, status }
  const [assigningAdvisor, setAssigningAdvisor] = useState(null); // { advisorId, advisorName, currentInstituteId }
  const [editingFields, setEditingFields] = useState(null); // { advisorId, advisorName, selectedFields: [] }
  const [editingLeader, setEditingLeader] = useState(null); // { instituteId, instituteName, leaderId }
  const [otpResult, setOtpResult] = useState(null); // { user, otp, expiresAt }
  const [otpTarget, setOtpTarget] = useState(null); // { id, name }
  const [confirmState, setConfirmState] = useState(null); // { message, onConfirm, danger }
  // اشتراک فردی کاربر (مشاور/دانش‌آموز) و محدودیت مؤسسه و کارت‌ها
  const [editingUserSub, setEditingUserSub] = useState(null); // { userId, name, daysFromNow, status }
  const [editingLimits, setEditingLimits] = useState(null); // { instituteId, name, maxAdvisors, maxStudents }
  const [editingCard, setEditingCard] = useState(null); // { kind, ownerId, title, cardNumber, shaba, holderName }
  const [systemCardInfo, setSystemCardInfo] = useState(null); // کارت پلتفرم فعلی
  // مبلغ ماهانه — { kind: 'USER'|'INSTITUTE', id, name, price }
  const [editingPrice, setEditingPrice] = useState(null);
  // تاریخ کنکور (تنظیمات سراسری) — فقط سوپرادمین همین‌جا تغییرش می‌دهد
  const [konkurDate, setKonkurDateDraft] = useState('');
  const [initialKonkurDate, setInitialKonkurDate] = useState('');
  // ردپای تغییرات (لاگ ممیزی)
  const [auditLogs, setAuditLogs] = useState([]);

  async function loadAll() {
    setLoading(true);
    try {
      const [pendingData, overviewData, studentsData, institutesData] = await Promise.all([
        fetchPendingAdvisors(),
        fetchAdvisorsOverview(),
        fetchStudentsOverview(),
        fetchInstitutes(),
      ]);
      setPending(pendingData.advisors);
      setOverview(overviewData.advisors);
      setStudents(studentsData.students);
      setInstitutes(institutesData.institutes);
      setSystemCardInfo(institutesData.systemCard || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // تاریخ کنکور را هم برای بخش تنظیمات سراسری می‌گیریم
    fetchKonkurDate()
      .then((data) => {
        setKonkurDateDraft(data.konkurDate || '');
        setInitialKonkurDate(data.konkurDate || '');
      })
      .catch(() => {});
    fetchAuditLogs()
      .then((data) => setAuditLogs(data.logs || []))
      .catch(() => {});
  }, []);

  // ذخیره‌ی تاریخ کنکور — روزشمار لندینگ بلافاصله به‌روز می‌شود
  async function handleSaveKonkurDate() {
    try {
      const res = await saveKonkurDate(konkurDate);
      toast.success(res.message || 'تاریخ کنکور ذخیره شد');
      setInitialKonkurDate(konkurDate);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleApprove(id) {
    try {
      await approveAdvisor(id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await rejectAdvisor(id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateInstitute(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await createInstitute(newInstituteName);
      setCreatedInstitute(data.institute);
      setNewInstituteName('');
      setShowInstituteForm(false);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleActivateInstitute(id) {
    setError('');
    try {
      await activateInstitute(id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  // تأیید حذف مؤسسه — اعضا به مستقل تبدیل می‌شوند
  function handleDeleteInstitute(inst) {
    setConfirmState({
      message: `مؤسسه‌ی «${inst.name}» حذف شود؟ ${toFaDigits(inst._count?.members || 0)} کاربر به مستقل تبدیل می‌شوند. این عمل قابل بازگشت نیست.`,
      danger: true,
      confirmText: '🗑 حذف',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await deleteInstitute(inst.id);
          toast.success(res.message || 'مؤسسه حذف شد');
          loadAll();
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // ذخیره‌ی تنظیمات اشتراک مؤسسه
  async function handleSaveSubscription() {
    if (!editingSub) return;
    const payload = {};
    if (editingSub.daysFromNow) payload.daysFromNow = Number(editingSub.daysFromNow);
    if (editingSub.status) payload.status = editingSub.status;
    try {
      const res = await updateInstituteSubscription(editingSub.instituteId, payload);
      toast.success(res.message || 'اشتراک به‌روزرسانی شد');
      setEditingSub(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ذخیره‌ی اشتراک فردی کاربر (مشاور مستقل / دانش‌آموز)
  async function handleSaveUserSubscription() {
    if (!editingUserSub) return;
    const payload = {};
    if (editingUserSub.daysFromNow) payload.daysFromNow = Number(editingUserSub.daysFromNow);
    if (editingUserSub.status) payload.status = editingUserSub.status;
    try {
      const res = await updateUserSubscription(editingUserSub.userId, payload);
      toast.success(res.message || 'اشتراک کاربر به‌روزرسانی شد');
      setEditingUserSub(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ذخیره‌ی سقف اعضای مؤسسه
  async function handleSaveLimits() {
    if (!editingLimits) return;
    const toNum = (v) => (v === '' || v == null ? null : Number(v));
    try {
      const res = await updateInstituteLimits(editingLimits.instituteId, {
        maxAdvisors: toNum(editingLimits.maxAdvisors),
        maxStudents: toNum(editingLimits.maxStudents),
      });
      toast.success(res.message || 'محدودیت‌ها ذخیره شد');
      setEditingLimits(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ذخیره‌ی کارت واریز (مؤسسه یا سیستم)
  async function handleSaveCard() {
    if (!editingCard) return;
    try {
      const rawPrice = String(editingCard.monthlyPrice || '').replace(/[^\d]/g, '');
      const payload = {
        cardNumber: editingCard.cardNumber,
        shaba: editingCard.shaba || undefined,
        holderName: editingCard.holderName || undefined,
        monthlyPrice: rawPrice ? Number(rawPrice) : null,
      };
      const res = editingCard.kind === 'SYSTEM'
        ? await setSystemCard(payload)
        : await setInstituteCard(editingCard.ownerId, payload);
      toast.success(res.message || 'کارت ذخیره شد');
      setEditingCard(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ذخیره‌ی مبلغ ماهانه (کاربر یا مؤسسه) — خالی یعنی حذف قیمت
  async function handleSavePrice() {
    if (!editingPrice) return;
    const raw = String(editingPrice.price || '').replace(/[^\d]/g, '');
    const price = raw ? Number(raw) : null;
    try {
      const res = editingPrice.kind === 'USER'
        ? await setUserMonthlyPrice(editingPrice.id, price)
        : await setInstituteMonthlyPrice(editingPrice.id, price);
      toast.success(res.message || 'مبلغ ماهانه ذخیره شد');
      setEditingPrice(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // برچسب وضعیت اشتراک فردی کاربر
  // (مقایسه‌ی تاریخ در هر رندر صریحاً خواسته شده — برای جلوگیری از warning پurity
  // از eslint-disable استفاده می‌شود)
  function userSubLabel(sub) {
    if (!sub) return { text: 'بدون اشتراک (آزاد)', cls: 'pending' };
    // eslint-disable-next-line react-hooks/purity
    const expired = sub.status === 'EXPIRED' || new Date(sub.endsAt).getTime() < Date.now();
    if (expired) return { text: `⛔ منقضی (${formatJalaliDate(sub.endsAt, { withYear: false })})`, cls: 'skipped' };
    if (sub.status === 'TRIAL') return { text: `آزمایشی تا ${formatJalaliDate(sub.endsAt, { withYear: false })}`, cls: 'pending' };
    return { text: `فعال تا ${formatJalaliDate(sub.endsAt, { withYear: false })}`, cls: 'done' };
  }

  // تخصیص مشاور به مؤسسه
  async function handleAssignAdvisor() {
    if (!assigningAdvisor) return;
    try {
      const res = await assignAdvisorToInstitute(
        assigningAdvisor.advisorId,
        assigningAdvisor.selectedInstituteId || null
      );
      toast.success(res.message || 'تخصیص انجام شد');
      setAssigningAdvisor(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ذخیره‌ی رشته‌های تخصص مشاور
  async function handleSaveFields() {
    if (!editingFields) return;
    try {
      const res = await assignAdvisorFields(editingFields.advisorId, editingFields.selectedFields);
      toast.success(res.message || 'رشته‌ها به‌روزرسانی شد');
      setEditingFields(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // تعیین/عزل نماینده‌ی مؤسسه
  async function handleSaveLeader() {
    if (!editingLeader) return;
    try {
      const res = await setInstituteLeader(editingLeader.instituteId, editingLeader.leaderId || null);
      toast.success(res.message || 'نماینده ذخیره شد');
      setEditingLeader(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // غیرفعال‌کردن مشاور
  function handleDeactivateAdvisor(advisor) {
    setConfirmState({
      message: `مشاور «${advisor.fullName}» غیرفعال شود؟ نمی‌تواند وارد شود و در فهرست مشاوران دانش‌آموزان نمایش داده نمی‌شود. قابل بازگشت است.`,
      danger: true,
      confirmText: '⏸ غیرفعال',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await deactivateAdvisor(advisor.id);
          toast.success(res.message || 'مشاور غیرفعال شد');
          loadAll();
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // فعال‌کردن مجدد مشاور
  async function handleReactivateAdvisor(advisor) {
    try {
      const res = await reactivateAdvisor(advisor.id);
      toast.success(res.message || 'مشاور دوباره فعال شد');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // غیرفعال‌کردن دانش‌آموز
  function handleDeactivateStudent(student) {
    setConfirmState({
      message: `دانش‌آموز «${student.fullName}» غیرفعال شود؟ نمی‌تواند وارد شود. قابل بازگشت است.`,
      danger: true,
      confirmText: '⏸ غیرفعال',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await deactivateStudent(student.id);
          toast.success(res.message || 'دانش‌آموز غیرفعال شد');
          loadAll();
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // فعال‌کردن مجدد دانش‌آموز
  async function handleReactivateStudent(student) {
    try {
      const res = await reactivateStudent(student.id);
      toast.success(res.message || 'دانش‌آموز دوباره فعال شد');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // حذف دانش‌آموز (hard delete)
  function handleDeleteStudent(student) {
    setConfirmState({
      message: `دانش‌آموز «${student.fullName}» برای همیشه حذف شود؟ همه‌ی برنامه‌ها و آزمون‌های او هم پاک می‌شوند. این عمل قابل بازگشت نیست.`,
      danger: true,
      confirmText: '🗑 حذف برای همیشه',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await deleteStudent(student.id);
          toast.success(res.message || 'دانش‌آموز حذف شد');
          loadAll();
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }
  function handleDeleteAdvisor(advisor) {
    setConfirmState({
      message: `مشاور «${advisor.fullName}» برای همیشه حذف شود؟ همه‌ی برنامه‌ها، آزمون‌ها و یادآورهای او هم پاک می‌شوند. این عمل قابل بازگشت نیست.`,
      danger: true,
      confirmText: '🗑 حذف برای همیشه',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await deleteAdvisor(advisor.id);
          toast.success(res.message || 'مشاور حذف شد');
          loadAll();
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // ساخت OTP برای کاربر
  async function handleCreateOtp() {
    if (!otpTarget) return;
    try {
      const res = await createUserOtp(otpTarget.id);
      setOtpResult(res);
      setOtpTarget(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function subLabel(inst) {
    if (!inst.subscription) return { text: 'بدون اشتراک', cls: 'pending' };
    const s = inst.subscription.status;
    if (s === 'ACTIVE') return { text: `فعال تا ${formatJalaliDate(inst.subscription.endsAt, { withYear: false })}`, cls: 'done' };
    if (s === 'TRIAL') return { text: `آزمایشی تا ${formatJalaliDate(inst.subscription.endsAt, { withYear: false })}`, cls: 'pending' };
    if (s === 'GRACE') return { text: 'تمدید نشده (مهلت)', cls: 'pending' };
    return { text: 'منقضی', cls: 'skipped' };
  }

  return (
    <div className="admin-panel-wrap">
      {error && (
        <div className="alert alert-error" onClick={() => setError('')}>
          <span>⚠</span> {error}
        </div>
      )}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>در حال بارگذاری…</p>
        </div>
      )}

      {!loading && (
        <>
          {/* کارت واریز پلتفرم — مشاوران مستقل و مؤسسه‌ها به این کارت واریز می‌کنند */}
          <section className="card admin-section">
            <h3 className="card-title">
              <span aria-hidden>💳</span> کارت واریز پلتفرم
            </h3>
            <p className="muted-text" style={{ margin: '0 0 10px', fontSize: 13 }}>
              مشاوران مستقل، مدیران مؤسسه و مؤسسه‌ها برای تمدید اشتراک‌شان به این کارت واریز می‌کنند
              و رسیدشان در صفحه‌ی واریز برای شما نمایش داده می‌شود تا تأیید کنید.
            </p>
            {systemCardInfo ? (
              <div className="card-number-box" style={{ marginBottom: 10 }}>
                <div className="card-number" dir="ltr">
                  {String(systemCardInfo.cardNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}
                </div>
                {systemCardInfo.holderName && <div className="card-holder">{systemCardInfo.holderName}</div>}
              </div>
            ) : (
              <div className="expired-banner warn" style={{ marginBottom: 10 }}>
                هنوز کارتی ثبت نشده — تا ثبت، مشاوران مستقل و مدیران مؤسسه صفحه‌ی واریز خالی می‌بینند.
              </div>
            )}
            <button
              className="btn-secondary btn-sm"
              onClick={() => setEditingCard({
                kind: 'SYSTEM',
                ownerId: null,
                title: 'کارت واریز پلتفرم (سوپرادمین)',
                cardNumber: systemCardInfo?.cardNumber || '',
                shaba: systemCardInfo?.shaba || '',
                holderName: systemCardInfo?.holderName || '',
                monthlyPrice: systemCardInfo?.monthlyPrice != null ? String(systemCardInfo.monthlyPrice) : '',
              })}
            >
              {systemCardInfo ? '💳 ویرایش کارت پلتفرم' : '💳 تنظیم کارت پلتفرم'}
            </button>
          </section>

          {/* تنظیمات سراسری — تاریخ کنکور (روزشمار لندینگ). فقط همین‌جا قابل تغییر است. */}
          <section className="card admin-section">
            <h3 className="card-title">
              <span aria-hidden>📅</span> تنظیمات سراسری
            </h3>
            <label className="field-label">
              تاریخ کنکور (روزشمار صفحه‌ی لندینگ)
              <JalaliDatePicker
                value={konkurDate}
                onChange={(v) => setKonkurDateDraft(v)}
                placeholder="تاریخ کنکور را انتخاب کنید"
              />
            </label>
            <div className="profile-form-actions" style={{ marginTop: 8 }}>
              <button
                className="btn-primary btn-sm"
                onClick={handleSaveKonkurDate}
                disabled={!konkurDate || konkurDate === initialKonkurDate}
              >
                ✓ ذخیره‌ی تاریخ کنکور
              </button>
              {konkurDate && (
                <span className="field-hint">
                  {konkurCountdownText(konkurDate) || 'این تاریخ گذشته است'} — در لندینگ همین‌طور نمایش داده می‌شود
                </span>
              )}
            </div>
          </section>

          {/* ردپای تغییرات — لاگ ممیزی آخرین اکشن‌های مدیریتی */}
          <section className="card admin-section">
            <h3 className="card-title">
              <span aria-hidden>🧾</span> ردپای تغییرات
            </h3>
            <p className="muted-text" style={{ margin: '0 0 12px', fontSize: 13 }}>
              آخرین اکشن‌های مدیریتی با تاریخ و جزئیات — برای شفافیت و پیگیری.
            </p>
            {auditLogs.length === 0 ? (
              <p className="muted-text">هنوز اکشنی ثبت نشده.</p>
            ) : (
              <div className="audit-log-list">
                {auditLogs.map((log) => (
                  <div key={log.id} className="audit-log-row">
                    <span className={`audit-action audit-${log.targetType.toLowerCase()}`}>
                      {auditActionLabel(log.action)}
                    </span>
                    <span className="audit-detail">
                      {log.details?.label || log.targetId}
                      {log.details?.after != null && log.details?.before != null && (
                        <small>
                          {' '}({toFaDigits(log.details.before)} ← {toFaDigits(log.details.after)})
                        </small>
                      )}
                    </span>
                    <span className="audit-meta">
                      {log.actorName} · {formatJalaliDate(log.createdAt, { withYear: false })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* بخش مؤسسه‌ها */}
          <section className="card admin-section">
            <h3 className="card-title">
              <span aria-hidden>🏫</span> مؤسسه‌های آموزشی
            </h3>

            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowInstituteForm((s) => !s)}
            >
              {showInstituteForm ? '✕ بستن فرم' : '＋ مؤسسه‌ی جدید'}
            </button>

            {showInstituteForm && (
              <form className="institute-create-form" onSubmit={handleCreateInstitute}>
                <input
                  value={newInstituteName}
                  onChange={(e) => setNewInstituteName(e.target.value)}
                  placeholder="نام مؤسسه — مثلاً آموزشگاه گاج تهران"
                  required
                  minLength={2}
                />
                <button type="submit" className="btn-primary btn-sm">
                  ساخت مؤسسه
                </button>
              </form>
            )}

            {createdInstitute && (
              <div className="alert alert-success">
                <span>✓</span>
                <div>
                  «{createdInstitute.name}» ساخته شد. کد دعوت:
                  <strong className="institute-code-box sm" dir="ltr">{createdInstitute.code}</strong>
                </div>
              </div>
            )}

            {institutes.length === 0 && (
              <div className="empty-card small">
                <span className="empty-emoji" aria-hidden>🏫</span>
                <p>هنوز مؤسسه‌ای ثبت نشده است.</p>
              </div>
            )}
            <div className="institute-admin-list">
              {institutes.map((inst) => {
                const sub = subLabel(inst);
                return (
                  <div key={inst.id} className="institute-admin-row institute-admin-row-extended">
                    <div className="institute-admin-info">
                      <strong>
                        {inst.name}
                        {inst.leader && (
                          <span className="leader-pill" title="نماینده‌ی مؤسسه">👤 {inst.leader.fullName}</span>
                        )}
                      </strong>
                      <small className="muted-text">
                        {toFaDigits(inst._count.members)} عضو · ساخته‌شده {formatJalaliDate(inst.createdAt, { withYear: false })}
                      </small>
                    </div>
                    <span className="institute-code-box sm" dir="ltr" title="کد دعوت">{inst.code}</span>
                    <span className={`status-pill ${sub.cls}`}>{sub.text}</span>
                    <span className={`status-pill ${inst.status === 'ACTIVE' ? 'done' : 'pending'}`}>
                      {inst.status === 'ACTIVE' ? 'تأییدشده' : 'در انتظار تأیید'}
                    </span>
                    <div className="institute-admin-actions">
                      {inst.status !== 'ACTIVE' && (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleActivateInstitute(inst.id)}
                        >
                          ✓ تأیید
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
                        ⏳ اشتراک
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setEditingPrice({
                          kind: 'INSTITUTE',
                          id: inst.id,
                          name: inst.name,
                          price: inst.monthlyPrice != null ? String(inst.monthlyPrice) : '',
                        })}
                        title="مبلغ ماهانه‌ی اشتراک مؤسسه — مبنای محاسبه‌ی خودکار روزهای تمدید"
                      >
                        💰 مبلغ ماهانه{inst.monthlyPrice != null ? ` (${toFaDigits(Number(inst.monthlyPrice).toLocaleString('en-US'))})` : ''}
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
                        👤 نماینده
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setEditingLimits({
                          instituteId: inst.id,
                          name: inst.name,
                          maxAdvisors: inst.subscription?.maxAdvisors ?? '',
                          maxStudents: inst.subscription?.maxStudents ?? '',
                        })}
                        title="سقف مشاور/دانش‌آموز مؤسسه — خالی یعنی بی‌نهایت"
                      >
                        🚧 سقف اعضا
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
                        💳 کارت
                      </button>
                      <button
                        className="btn-secondary btn-sm btn-danger"
                        onClick={() => handleDeleteInstitute(inst)}
                        title="حذف مؤسسه"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* بخش مشاوران در انتظار تأیید */}
          <section className="card admin-section">
            <h3 className="card-title">
              <span aria-hidden>⏳</span> مشاوران در انتظار تأیید
            </h3>
            {pending.length === 0 && (
              <div className="empty-card small">
                <span className="empty-emoji" aria-hidden>✅</span>
                <p>فعلاً مشاور در انتظاری وجود ندارد.</p>
              </div>
            )}
            <div className="pending-advisor-list">
              {pending.map((advisor) => (
                <div key={advisor.id} className="pending-advisor-card">
                  <div className="pending-advisor-head">
                    <div className="pending-advisor-avatar">
                      {(advisor.fullName || '؟').charAt(0)}
                    </div>
                    <div className="pending-advisor-info">
                      <strong className="pending-advisor-name">{advisor.fullName}</strong>
                      <span className="pending-advisor-date">
                        ثبت‌نام در: {formatJalaliDate(advisor.createdAt, { withWeekday: false })}
                      </span>
                      {advisor.institute && (
                        <span className="muted-text" style={{ fontSize: '11px' }}>
                          🏫 {advisor.institute.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pending-advisor-contacts">
                    <div className="contact-row">
                      <span className="contact-label">📧 ایمیل:</span>
                      <a href={`mailto:${advisor.email}`} className="contact-value" dir="ltr">
                        {advisor.email}
                      </a>
                    </div>
                    {advisor.phone && (
                      <div className="contact-row">
                        <span className="contact-label">📞 تماس:</span>
                        <a href={`tel:${advisor.phone}`} className="contact-value" dir="ltr">
                          {toFaDigits(advisor.phone)}
                        </a>
                      </div>
                    )}
                  </div>

                  {advisor.bio && (
                    <div className="pending-advisor-bio">
                      <div className="bio-label">📝 توضیحات مشاور:</div>
                      <p className="bio-text">{advisor.bio}</p>
                    </div>
                  )}

                  <div className="pending-advisor-actions">
                    <button className="btn-primary" onClick={() => handleApprove(advisor.id)}>
                      ✓ تأیید
                    </button>
                    <button className="btn-secondary" onClick={() => handleReject(advisor.id)}>
                      ✕ رد
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* بخش دانش‌آموزان (نمای کلی) */}
          <section className="card admin-section">
            <h3 className="card-title">
              <span aria-hidden>🎒</span> نمای کلی دانش‌آموزان
            </h3>
            {students.length === 0 && (
              <div className="empty-card small">
                <span className="empty-emoji" aria-hidden>🎒</span>
                <p>هنوز دانش‌آموزی ثبت‌نام نکرده است.</p>
              </div>
            )}
            <div className="overview-list">
              {students.map((student) => (
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
                      <div>
                        <strong>{student.fullName || 'بدون نام'}</strong>
                        <span className="muted-text overview-count">
                          {student.advisor
                            ? `مشاور: ${student.advisor.fullName}`
                            : student.pendingAdvisor
                              ? `⏳ درخواست به ${student.pendingAdvisor.fullName}`
                              : 'بدون مشاور'}
                          {student.institute && (
                            <span className="advisor-institute-pill">🏫 {student.institute.name}</span>
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
                        {student.status === 'ACTIVE' ? '✓ فعال'
                         : student.status === 'SUSPENDED' ? '⏸ غیرفعال'
                         : student.status === 'PENDING' ? '⏳ در انتظار'
                         : '✕ رد شده'}
                      </span>
                      <span className="chevron">{expandedId === student.id ? '▾' : '▸'}</span>
                    </div>
                  </div>

                  {expandedId === student.id && (
                    <div className="overview-detail">
                      <div className="overview-bio-row">
                        <span className="muted-text">📧 ایمیل:</span>
                        <a href={`mailto:${student.email}`} dir="ltr">{student.email}</a>
                      </div>
                      {student.phone && (
                        <div className="overview-bio-row">
                          <span className="muted-text">📞 تماس:</span>
                          <a href={`tel:${student.phone}`} dir="ltr">{toFaDigits(student.phone)}</a>
                        </div>
                      )}
                      {student.bio && (
                        <div className="overview-bio-row">
                          <span className="muted-text">📝 توضیحات:</span>
                          <span>{student.bio}</span>
                        </div>
                      )}
                      <div className="overview-bio-row">
                        <span className="muted-text">🎓 رشته:</span>
                        <span>
                          {student.field
                            ? (ALL_FIELDS.find((x) => x.value === student.field)?.label || student.field)
                            : '—'}
                        </span>
                      </div>
                      <div className="overview-bio-row">
                        <span className="muted-text">🏫 مؤسسه:</span>
                        <span>{student.institute ? student.institute.name : 'مستقل'}</span>
                      </div>
                      <div className="overview-bio-row">
                        <span className="muted-text">📅 اشتراک فردی:</span>
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
                        >
                          ⏳ اشتراک
                        </button>
                        <button
                          className="btn-secondary btn-xs"
                          onClick={() => setEditingPrice({
                            kind: 'USER',
                            id: student.id,
                            name: student.fullName,
                            price: student.monthlyPrice != null ? String(student.monthlyPrice) : '',
                          })}
                          title="مبلغ ماهانه — مبنای محاسبه‌ی خودکار روزهای تمدید هنگام تأیید رسید"
                        >
                          💰 مبلغ ماهانه
                        </button>
                      </div>
                      <div className="overview-bio-row">
                        <span className="muted-text">👥 مشاور:</span>
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
                        >
                          🔑 OTP
                        </button>
                        {student.status === 'ACTIVE' && (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleDeactivateStudent(student)}
                            title="غیرفعال‌کردن دانش‌آموز"
                          >
                            ⏸ غیرفعال
                          </button>
                        )}
                        {student.status === 'SUSPENDED' && (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => handleReactivateStudent(student)}
                          >
                            ✓ فعال‌کردن
                          </button>
                        )}
                        <button
                          className="btn-secondary btn-sm btn-danger"
                          onClick={() => handleDeleteStudent(student)}
                          title="حذف دانش‌آموز (غیرقابل بازگشت)"
                        >
                          🗑 حذف
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* بخش نمای کلی مشاوران فعال */}
          <section className="card admin-section">
            <h3 className="card-title">
              <span aria-hidden>👥</span> نمای کلی مشاوران فعال
            </h3>
            {overview.length === 0 && (
              <div className="empty-card small">
                <span className="empty-emoji" aria-hidden>👥</span>
                <p>هنوز مشاور فعالی وجود ندارد.</p>
              </div>
            )}
            <div className="overview-list">
              {overview.map((advisor) => (
                <div key={advisor.id} className="overview-row">
                  <div
                    className="overview-head"
                    onClick={() => setExpandedId(expandedId === advisor.id ? null : advisor.id)}
                  >
                    <div className="overview-advisor">
                      <div className="overview-avatar">
                        {(advisor.fullName || '؟').charAt(0)}
                      </div>
                      <div>
                        <strong>
                          {advisor.fullName || 'بدون نام'}
                          {advisor.role === 'SUPERADMIN' && (
                            <span className="superadmin-pill" title="این حساب مدیر ارشد پلتفرم است">
                              👑 مدیر ارشد
                            </span>
                          )}
                        </strong>
                        <span className="muted-text overview-count">
                          {toFaDigits(advisor.asAdvisorLinks.length)} دانش‌آموز
                          {advisor.institute && (
                            <span className="advisor-institute-pill">🏫 {advisor.institute.name}</span>
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
                          📞 {toFaDigits(advisor.phone)}
                        </a>
                      )}
                      <span className="chevron">{expandedId === advisor.id ? '▾' : '▸'}</span>
                    </div>
                  </div>

                  {expandedId === advisor.id && (
                    <div className="overview-detail">
                      <div className="overview-bio-row">
                        <span className="muted-text">📧 ایمیل:</span>
                        <a href={`mailto:${advisor.email}`} dir="ltr">{advisor.email}</a>
                      </div>
                      {advisor.bio && (
                        <div className="overview-bio-row">
                          <span className="muted-text">📝 توضیحات:</span>
                          <span>{advisor.bio}</span>
                        </div>
                      )}
                      <div className="overview-bio-row">
                        <span className="muted-text">🏫 مؤسسه:</span>
                        <span>{advisor.institute ? advisor.institute.name : 'مستقل'}</span>
                      </div>
                      <div className="overview-bio-row">
                        <span className="muted-text">📅 اشتراک فردی:</span>
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
                          >
                            ⏳ اشتراک
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
                            title="مبلغ ماهانه — مبنای محاسبه‌ی خودکار روزهای تمدید هنگام تأیید رسید"
                          >
                            💰 مبلغ ماهانه
                          </button>
                        )}
                      </div>
                      <div className="overview-bio-row">
                        <span className="muted-text">📊 وضعیت:</span>
                        <span className={`status-pill ${
                          advisor.status === 'ACTIVE' ? 'done'
                          : advisor.status === 'SUSPENDED' ? 'skipped'
                          : advisor.status === 'PENDING' ? 'pending'
                          : 'skipped'
                        }`}>
                          {advisor.status === 'ACTIVE' ? '✓ فعال'
                           : advisor.status === 'SUSPENDED' ? '⏸ غیرفعال'
                           : advisor.status === 'PENDING' ? '⏳ در انتظار تأیید'
                           : '✕ رد شده'}
                        </span>
                      </div>
                      {advisor.fields && advisor.fields.length > 0 && (
                        <div className="overview-bio-row">
                          <span className="muted-text">🎓 رشته‌های تخصص:</span>
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
                        >
                          🏫 تخصیص به مؤسسه
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setEditingFields({
                            advisorId: advisor.id,
                            advisorName: advisor.fullName,
                            selectedFields: advisor.fields || [],
                          })}
                          title="ویرایش رشته‌های تخصص"
                        >
                          🎓 رشته‌های تخصص
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setOtpTarget({ id: advisor.id, name: advisor.fullName })}
                          title="ساخت رمز یک‌بار مصرف"
                        >
                          🔑 OTP
                        </button>
                        {/* حساب سوپرادمین غیرفعال/حذف نمی‌شود — کل پنل مدیریتی به آن وابسته است */}
                        {advisor.role !== 'SUPERADMIN' && advisor.status === 'ACTIVE' && (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleDeactivateAdvisor(advisor)}
                            title="غیرفعال‌کردن مشاور"
                          >
                            ⏸ غیرفعال
                          </button>
                        )}
                        {advisor.role !== 'SUPERADMIN' && advisor.status === 'SUSPENDED' && (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => handleReactivateAdvisor(advisor)}
                            title="فعال‌کردن مجدد"
                          >
                            ✓ فعال‌کردن
                          </button>
                        )}
                        {advisor.role !== 'SUPERADMIN' && (
                          <button
                            className="btn-secondary btn-sm btn-danger"
                            onClick={() => handleDeleteAdvisor(advisor)}
                            title="حذف مشاور (غیرقابل بازگشت)"
                          >
                            🗑 حذف
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
                                  📧 {link.student.email}
                                </a>
                                {link.student.phone && (
                                  <a href={`tel:${link.student.phone}`} dir="ltr">
                                    📞 {toFaDigits(link.student.phone)}
                                  </a>
                                )}
                                <button
                                  className="btn-secondary btn-xs"
                                  onClick={() => setOtpTarget({ id: link.student.id, name: link.student.fullName })}
                                  title="رمز یک‌بار مصرف"
                                >
                                  🔑 OTP
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
        </>
      )}

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

      {/* مودال ویرایش اشتراک */}
      {editingSub && (
        <div className="modal-overlay" onClick={() => setEditingSub(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3>⏳ تنظیم اشتراک — {editingSub.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingSub(null)} aria-label="بستن">✕</button>
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
                <button className="btn-primary" onClick={handleSaveSubscription}>✓ ذخیره</button>
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
              <h3>🏫 تخصیص مشاور به مؤسسه</h3>
              <button className="btn-icon-only" onClick={() => setAssigningAdvisor(null)} aria-label="بستن">✕</button>
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
                <button className="btn-primary" onClick={handleAssignAdvisor}>✓ ذخیره</button>
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
              <h3>🎓 رشته‌های تخصص مشاور</h3>
              <button className="btn-icon-only" onClick={() => setEditingFields(null)} aria-label="بستن">✕</button>
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
                        <span className="field-emoji" aria-hidden>{f.emoji}</span>
                        <span className="field-name">{f.label}</span>
                        {isSelected && <span className="field-check" aria-hidden>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <span className="field-hint">
                  {editingFields.selectedFields.length === 0
                    ? '⚠️ حداقل یک رشته باید انتخاب باشد، وگرنه هیچ دانش‌آموزی نمی‌تواند این مشاور را انتخاب کند.'
                    : `${toFaDigits(editingFields.selectedFields.length)} رشته انتخاب شده`}
                </span>
              </div>
              <div className="profile-form-actions">
                <button className="btn-primary" onClick={handleSaveFields}>✓ ذخیره</button>
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
              <h3>👤 نماینده‌ی مؤسسه</h3>
              <button className="btn-icon-only" onClick={() => setEditingLeader(null)} aria-label="بستن">✕</button>
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
                <button className="btn-primary" onClick={handleSaveLeader}>✓ ذخیره</button>
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
              <h3>🔑 ساخت رمز یک‌بار مصرف</h3>
              <button className="btn-icon-only" onClick={() => setOtpTarget(null)} aria-label="بستن">✕</button>
            </div>
            <p style={{ lineHeight: 1.8 }}>
              برای کاربر «{otpTarget.name}» یک رمز یک‌بار مصرف ساخته می‌شود.
              این رمز به‌صورت خودکار به ایمیل کاربر ارسال می‌شود؛ اگر SMTP تنظیم نباشد،
              باید دستی به او بدهید. کاربر با ایمیل و این رمز وارد می‌شود
              و بعد از ورود باید رمز عبور جدیدی تعیین کند.
            </p>
            <div className="profile-form-actions">
              <button className="btn-primary" onClick={handleCreateOtp}>🔑 ساخت OTP</button>
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
              <h3>✅ رمز یک‌بار مصرف ساخته شد</h3>
              <button className="btn-icon-only" onClick={() => setOtpResult(null)} aria-label="بستن">✕</button>
            </div>
            <p className="muted-text" style={{ marginBottom: 12 }}>
              {otpResult.emailed
                ? 'این رمز به‌صورت خودکار به ایمیل کاربر ارسال شد.'
                : '⚠ ارسال خودکار ایمیل انجام نشد (SMTP تنظیم نیست)؛ این رمز را دستی به کاربر بدهید.'}
              {' '}طول عمر آن {toFaDigits(otpResult.ttlHours)} ساعت است و فقط یک بار قابل استفاده است.
            </p>
            <div className="otp-result-box" dir="ltr">
              {otpResult.otp}
            </div>
            <p className="muted-text" style={{ marginTop: 12, fontSize: 12 }}>
              💡 کاربر باید با ایمیل خود و این رمز وارد شود و سپس رمز جدیدی تعیین کند.
            </p>
            <div className="profile-form-actions">
              <button className="btn-primary" onClick={() => {
                navigator.clipboard?.writeText(otpResult.otp);
                toast.success('کپی شد');
              }}>📋 کپی رمز</button>
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
              <h3>⏳ اشتراک فردی — {editingUserSub.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingUserSub(null)} aria-label="بستن">✕</button>
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
                <button className="btn-primary" onClick={handleSaveUserSubscription}>✓ ذخیره</button>
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
              <h3>💰 مبلغ ماهانه — {editingPrice.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingPrice(null)} aria-label="بستن">✕</button>
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
                <button className="btn-primary" onClick={handleSavePrice}>✓ ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingPrice(null)}>انصراف</button>
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
              <h3>🚧 سقف اعضا — {editingLimits.name}</h3>
              <button className="btn-icon-only" onClick={() => setEditingLimits(null)} aria-label="بستن">✕</button>
            </div>
            <div className="profile-form">
              <p className="muted-text" style={{ margin: '0 0 8px', fontSize: 13 }}>
                وقتی تعداد اعضا به سقف برسد، عضو جدید پذیرفته نمی‌شود و پیام «اشتراک را ارتقا دهید» نمایش داده می‌شود.
                خالی گذاشتن یعنی بی‌نهایت.
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
                <button className="btn-primary" onClick={handleSaveLimits}>✓ ذخیره</button>
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
              <h3>💳 {editingCard.title}</h3>
              <button className="btn-icon-only" onClick={() => setEditingCard(null)} aria-label="بستن">✕</button>
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
                <button className="btn-primary" onClick={handleSaveCard}>✓ ذخیره</button>
                <button className="btn-secondary" onClick={() => setEditingCard(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
