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
  setAdvisorStudentLimit,
  setInstituteReferralAdmin,
  setInstituteCard,
  setSystemCard,
  setUserMonthlyPrice,
  setInstituteMonthlyPrice,
  fetchKonkurDate,
  setKonkurDate as saveKonkurDate,
  fetchAuditLogs,
} from '../api/client';
import { formatJalaliDate, toFaDigits } from '../utils/jalali';
import { useToast } from '../context/ToastContext';
import Ico from './Ico';

import AdminModals from './admin/AdminModals';
import AdminInstitutesSection from './admin/AdminInstitutesSection';
import AdminPendingAdvisorsSection from './admin/AdminPendingAdvisorsSection';
import AdminStudentsSection from './admin/AdminStudentsSection';
import AdminAdvisorsSection from './admin/AdminAdvisorsSection';
import AdminSystemSection from './admin/AdminSystemSection';

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
  const [activeTab, setActiveTab] = useState('all'); // all | institutes | pending | advisors | students | system

  const [pending, setPending] = useState([]);
  const [overview, setOverview] = useState([]);
  const [students, setStudents] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [createdInstitute, setCreatedInstitute] = useState(null);

  // حالت‌های مودال‌ها
  const [editingSub, setEditingSub] = useState(null);
  const [assigningAdvisor, setAssigningAdvisor] = useState(null);
  const [editingFields, setEditingFields] = useState(null);
  const [editingLeader, setEditingLeader] = useState(null);
  const [otpResult, setOtpResult] = useState(null);
  const [otpTarget, setOtpTarget] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [editingUserSub, setEditingUserSub] = useState(null);
  const [editingLimits, setEditingLimits] = useState(null);
  const [editingAdvisorLimit, setEditingAdvisorLimit] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [systemCardInfo, setSystemCardInfo] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);

  // تنظیمات سراسری
  const [konkurDate, setKonkurDateDraft] = useState('');
  const [initialKonkurDate, setInitialKonkurDate] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  async function loadAll(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      const [pendingData, overviewData, studentsData, institutesData] = await Promise.all([
        fetchPendingAdvisors(),
        fetchAdvisorsOverview(),
        fetchStudentsOverview(),
        fetchInstitutes(),
      ]);
      setPending(pendingData.advisors || []);
      setOverview(overviewData.advisors || []);
      setStudents(studentsData.students || []);
      setInstitutes(institutesData.institutes || []);
      setSystemCardInfo(institutesData.systemCard || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(false);
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
      toast.success('مشاور تأیید شد');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await rejectAdvisor(id);
      toast.success('مشاور رد شد');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateInstitute(payload) {
    setError('');
    const data = await createInstitute(payload);
    setCreatedInstitute(data.institute);
    toast.success(data.message || 'آموزشگاه با موفقیت ساخته شد');
    loadAll();
  }

  async function handleActivateInstitute(id) {
    setError('');
    try {
      const res = await activateInstitute(id);
      toast.success(res.message || 'آموزشگاه و حساب مدیر فعال شدند');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDeleteInstitute(inst) {
    setConfirmState({
      message: `مؤسسه‌ی «${inst.name}» حذف شود؟ ${toFaDigits(inst._count?.members || 0)} کاربر به مستقل تبدیل می‌شوند. این عمل قابل بازگشت نیست.`,
      danger: true,
      confirmText: 'حذف',
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

  async function handleSaveAdvisorLimit() {
    if (!editingAdvisorLimit) return;
    const value = editingAdvisorLimit.value === '' || editingAdvisorLimit.value == null
      ? null
      : Number(editingAdvisorLimit.value);
    try {
      const res = await setAdvisorStudentLimit(editingAdvisorLimit.advisorId, value);
      toast.success(res.message || 'سقف دانش‌آموزان مشاور ذخیره شد');
      setEditingAdvisorLimit(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleToggleInstituteReferral(inst) {
    const nextState = inst.referralEnabled === false;
    try {
      await setInstituteReferralAdmin(inst.id, nextState);
      toast.success(`برنامه‌ی تخفیف دعوت برای «${inst.name}» ${nextState ? 'روشن' : 'خاموش'} شد`);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSavePrice() {
    if (!editingPrice) return;
    const priceNum = editingPrice.price === '' || editingPrice.price == null
      ? null
      : Number(editingPrice.price);
    try {
      if (editingPrice.kind === 'USER') {
        const res = await setUserMonthlyPrice(editingPrice.id, priceNum);
        toast.success(res.message || 'مبلغ ماهانه‌ی کاربر ذخیره شد');
      } else {
        const res = await setInstituteMonthlyPrice(editingPrice.id, priceNum);
        toast.success(res.message || 'مبلغ ماهانه‌ی مؤسسه ذخیره شد');
      }
      setEditingPrice(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSaveCard() {
    if (!editingCard) return;
    const toNum = (v) => (v === '' || v == null ? null : Number(v));
    const payload = {
      cardNumber: editingCard.cardNumber,
      shaba: editingCard.shaba || null,
      holderName: editingCard.holderName || null,
      monthlyPrice: toNum(editingCard.monthlyPrice),
    };
    try {
      if (editingCard.kind === 'SYSTEM') {
        const res = await setSystemCard(payload);
        toast.success(res.message || 'کارت پلتفرم ذخیره شد');
      } else {
        const res = await setInstituteCard(editingCard.ownerId, payload);
        toast.success(res.message || 'کارت مؤسسه ذخیره شد');
      }
      setEditingCard(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleAssignAdvisor() {
    if (!assigningAdvisor) return;
    try {
      const res = await assignAdvisorToInstitute(
        assigningAdvisor.advisorId,
        assigningAdvisor.selectedInstituteId || null,
      );
      toast.success(res.message || 'مشاور به مؤسسه تخصیص داده شد');
      setAssigningAdvisor(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

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

  function handleDeactivateAdvisor(advisor) {
    setConfirmState({
      message: `مشاور «${advisor.fullName}» غیرفعال شود؟ نمی‌تواند وارد شود و در فهرست مشاوران دانش‌آموزان نمایش داده نمی‌شود.`,
      danger: true,
      confirmText: 'غیرفعال',
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

  async function handleReactivateAdvisor(advisor) {
    try {
      const res = await reactivateAdvisor(advisor.id);
      toast.success(res.message || 'مشاور دوباره فعال شد');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleDeleteAdvisor(advisor) {
    setConfirmState({
      message: `مشاور «${advisor.fullName}» حذف شود؟ حساب کاربر، رشته‌های تخصص و تمام اتصال‌هایش به دانش‌آموزان حذف خواهد شد.`,
      danger: true,
      confirmText: 'حذف کامل',
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

  function handleDeactivateStudent(student) {
    setConfirmState({
      message: `دانش‌آموز «${student.fullName}» غیرفعال شود؟ نمی‌تواند وارد شود و مشاورش نمی‌تواند برای او برنامه/آزمون بسازد.`,
      danger: true,
      confirmText: 'غیرفعال',
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

  async function handleReactivateStudent(student) {
    try {
      const res = await reactivateStudent(student.id);
      toast.success(res.message || 'دانش‌آموز دوباره فعال شد');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleDeleteStudent(student) {
    setConfirmState({
      message: `دانش‌آموز «${student.fullName}» به‌طور کامل حذف شود؟ برنامه‌ها، ثبت ساعات مطالعه، آزمون‌ها و پاسخ‌برگ‌هایش برای همیشه پاک می‌شوند.`,
      danger: true,
      confirmText: 'حذف کامل',
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

  function userSubLabel(sub) {
    if (!sub) return { text: 'بدون اشتراک (نامحدود)', cls: 'done' };
    const s = sub.status;
    if (s === 'ACTIVE') return { text: `فعال تا ${formatJalaliDate(sub.endsAt, { withYear: false })}`, cls: 'done' };
    if (s === 'TRIAL') return { text: `آزمایشی تا ${formatJalaliDate(sub.endsAt, { withYear: false })}`, cls: 'pending' };
    if (s === 'GRACE') return { text: 'مهلت تمدید', cls: 'pending' };
    return { text: 'منقضی', cls: 'skipped' };
  }

  const pendingInstitutesCount = institutes.filter((i) => i.status !== 'ACTIVE').length;

  return (
    <div className="admin-panel-wrap">
      {error && (
        <div className="alert alert-error" onClick={() => setError('')}>
          <span><Ico e="⚠" /></span> {error}
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>در حال بارگذاری اطلاعات پنل مدیریت…</p>
        </div>
      )}

      {!loading && (
        <>
          {/* نوار فیلتر و تب‌های بالای پنل مدیریت */}
          <div className="admin-tab-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              type="button"
              className={`btn-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Ico e="📋" /> همه بخش‌ها
            </button>
            <button
              type="button"
              className={`btn-tab ${activeTab === 'institutes' ? 'active' : ''}`}
              onClick={() => setActiveTab('institutes')}
            >
              <Ico e="🏫" /> آموزشگاه‌ها ({toFaDigits(institutes.length)})
              {pendingInstitutesCount > 0 && (
                <span className="badge-pending" style={{ marginRight: 6, background: 'var(--amber, #f59e0b)', color: '#fff', padding: '2px 6px', borderRadius: 10, fontSize: 11 }}>
                  {toFaDigits(pendingInstitutesCount)}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`btn-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <Ico e="⏳" /> مشاوران در انتظار ({toFaDigits(pending.length)})
            </button>
            <button
              type="button"
              className={`btn-tab ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <Ico e="🎒" /> دانش‌آموزان ({toFaDigits(students.length)})
            </button>
            <button
              type="button"
              className={`btn-tab ${activeTab === 'advisors' ? 'active' : ''}`}
              onClick={() => setActiveTab('advisors')}
            >
              <Ico e="👥" /> مشاوران ({toFaDigits(overview.length)})
            </button>
            <button
              type="button"
              className={`btn-tab ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              <Ico e="⚙️" /> تنظیمات، کارت و ممیزی
            </button>
          </div>

          {(activeTab === 'all' || activeTab === 'institutes') && (
            <AdminInstitutesSection
              institutes={institutes}
              subLabel={subLabel}
              handleCreateInstitute={handleCreateInstitute}
              handleActivateInstitute={handleActivateInstitute}
              handleDeleteInstitute={handleDeleteInstitute}
              handleToggleInstituteReferral={handleToggleInstituteReferral}
              setEditingSub={setEditingSub}
              setEditingPrice={setEditingPrice}
              setEditingLeader={setEditingLeader}
              setEditingLimits={setEditingLimits}
              setEditingCard={setEditingCard}
              createdInstitute={createdInstitute}
            />
          )}

          {(activeTab === 'all' || activeTab === 'pending') && (
            <AdminPendingAdvisorsSection
              pending={pending}
              handleApprove={handleApprove}
              handleReject={handleReject}
            />
          )}

          {(activeTab === 'all' || activeTab === 'students') && (
            <AdminStudentsSection
              students={students}
              userSubLabel={userSubLabel}
              setEditingUserSub={setEditingUserSub}
              setEditingPrice={setEditingPrice}
              setOtpTarget={setOtpTarget}
              handleDeactivateStudent={handleDeactivateStudent}
              handleReactivateStudent={handleReactivateStudent}
              handleDeleteStudent={handleDeleteStudent}
            />
          )}

          {(activeTab === 'all' || activeTab === 'advisors') && (
            <AdminAdvisorsSection
              overview={overview}
              userSubLabel={userSubLabel}
              setEditingUserSub={setEditingUserSub}
              setEditingPrice={setEditingPrice}
              setEditingAdvisorLimit={setEditingAdvisorLimit}
              setAssigningAdvisor={setAssigningAdvisor}
              setEditingFields={setEditingFields}
              setOtpTarget={setOtpTarget}
              handleDeactivateAdvisor={handleDeactivateAdvisor}
              handleReactivateAdvisor={handleReactivateAdvisor}
              handleDeleteAdvisor={handleDeleteAdvisor}
            />
          )}

          {(activeTab === 'all' || activeTab === 'system') && (
            <AdminSystemSection
              systemCardInfo={systemCardInfo}
              setEditingCard={setEditingCard}
              konkurDate={konkurDate}
              setKonkurDateDraft={setKonkurDateDraft}
              handleSaveKonkurDate={handleSaveKonkurDate}
              initialKonkurDate={initialKonkurDate}
              auditLogs={auditLogs}
              auditActionLabel={auditActionLabel}
            />
          )}
        </>
      )}

      {/* تمام مودال‌های پنل مدیریت */}
      <AdminModals
        confirmState={confirmState}
        setConfirmState={setConfirmState}
        editingSub={editingSub}
        setEditingSub={setEditingSub}
        handleSaveSubscription={handleSaveSubscription}
        editingUserSub={editingUserSub}
        setEditingUserSub={setEditingUserSub}
        handleSaveUserSubscription={handleSaveUserSubscription}
        assigningAdvisor={assigningAdvisor}
        setAssigningAdvisor={setAssigningAdvisor}
        institutes={institutes}
        handleAssignAdvisor={handleAssignAdvisor}
        editingFields={editingFields}
        setEditingFields={setEditingFields}
        handleSaveFields={handleSaveFields}
        editingLeader={editingLeader}
        setEditingLeader={setEditingLeader}
        overview={overview}
        students={students}
        handleSaveLeader={handleSaveLeader}
        otpTarget={otpTarget}
        setOtpTarget={setOtpTarget}
        handleCreateOtp={handleCreateOtp}
        otpResult={otpResult}
        setOtpResult={setOtpResult}
        editingLimits={editingLimits}
        setEditingLimits={setEditingLimits}
        handleSaveLimits={handleSaveLimits}
        editingAdvisorLimit={editingAdvisorLimit}
        setEditingAdvisorLimit={setEditingAdvisorLimit}
        handleSaveAdvisorLimit={handleSaveAdvisorLimit}
        editingPrice={editingPrice}
        setEditingPrice={setEditingPrice}
        handleSavePrice={handleSavePrice}
        editingCard={editingCard}
        setEditingCard={setEditingCard}
        handleSaveCard={handleSaveCard}
        toast={toast}
      />
    </div>
  );
}
