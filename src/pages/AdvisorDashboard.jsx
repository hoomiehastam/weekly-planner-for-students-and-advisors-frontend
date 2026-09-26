import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMyStudents,
  fetchStudentPlans,
  fetchRemindersForStudent,
  sendReminder,
  fetchRandomQuote,
  deletePlan,
  deleteReminder,
  setStudentWeeklyGoal,
  fetchExamsForStudent,
  deleteExam,
  fetchExamSubmissions,
  gradeSubmission,
  fetchPendingStudentRequests,
  acceptStudentRequest,
  rejectStudentRequest,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DAY_NAMES } from '../utils/dayNames';
import { formatJalaliShort, formatRelativeTime, formatJalaliDate, formatJalaliDateTime, toFaDigits } from '../utils/jalali';
import PlanBuilder from '../components/PlanBuilder';
import Reports from '../components/Reports';
import AdminPanel from '../components/AdminPanel';
import ProfileModal from '../components/ProfileModal';
import ExamBuilder from '../components/ExamBuilder';
import ConfirmModal from '../components/ConfirmModal';
import FaNumberInput from '../components/FaNumberInput';
import AppHeader from '../components/AppHeader';
import StatCard from '../components/StatCard';
import { computeProgress, TimeBadge } from '../components/PlanBits';
import StudentListSidebar from '../components/advisor/StudentListSidebar';
import StudentContactInfo from '../components/advisor/StudentContactInfo';
import GradingModal from '../components/advisor/GradingModal';
import MobileNav from '../components/MobileNav';

function StatusLabel({ status }) {
  if (status === 'DONE') return <span className="status-pill done">انجام شده</span>;
  if (status === 'SKIPPED') return <span className="status-pill skipped">نادیده</span>;
  return <span className="status-pill pending">در انتظار</span>;
}

// یک روز از برنامه در نمای لیست مشاور — قابل باز/بسته شدن
function AdvisorDayBlock({ day }) {
  const [open, setOpen] = useState(false);
  const itemsDone = day.items.filter((i) => i.status === 'DONE').length;
  return (
    <div className={`day-block ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="day-header day-header-toggle"
        onClick={() => setOpen((o) => !o)}
        title={open ? 'جمع‌کردن این روز' : 'بازکردن این روز'}
      >
        <span className="day-header-title">
          <span className="chevron day-chevron">{open ? '▾' : '▸'}</span>
          <h4>{DAY_NAMES[day.dayOfWeek]}</h4>
        </span>
        {day.items.length > 0 && (
          <span className="day-count">
            {toFaDigits(itemsDone)}/{toFaDigits(day.items.length)}
          </span>
        )}
      </button>
      {open && (
        <div className="day-items-wrap">
          {day.items.length === 0 ? (
            <p className="muted-text">کاری برای این روز ثبت نشده.</p>
          ) : (
            day.items.map((item) => (
              <div className="task-row advisor-task" key={item.id}>
                <div className="task-content">
                  <strong>{item.subject}</strong>
                  {item.description && <span className="task-desc">{item.description}</span>}
                  <div className="task-meta">
                    <TimeBadge startTime={item.startTime} endTime={item.endTime} />
                    <StatusLabel status={item.status} />
                    {item.tags.map((t) => (
                      <span className="tag-pill" key={t.tag.id}>
                        {t.tag.name}
                      </span>
                    ))}
                  </div>
                  {/* نمایش per-tag لاگ‌های دانش‌آموز برای این درس */}
                  {(item.itemLogs || []).length > 0 && (
                    <div className="advisor-pertag-list">
                      <div className="advisor-pertag-label">
                        📝 زمانی که دانش‌آموز ثبت کرده:
                      </div>
                      {(item.itemLogs || []).map((log, logIdx) => (
                        <div
                          key={logIdx}
                          className={`advisor-pertag-row ${log.tagId ? '' : 'is-other'}`}
                        >
                          <span className="advisor-pertag-name">
                            {log.tag ? log.tag.name : '📌 سایر کارها'}
                          </span>
                          <span className="advisor-pertag-min">
                            ⏱ {toFaDigits(log.minutes)} دقیقه
                          </span>
                          {log.testsTaken !== null && log.testsTaken !== undefined && (
                            <span className="advisor-pertag-tests">
                              ✎ {toFaDigits(log.testsTaken)} تست
                            </span>
                          )}
                          {log.note && (
                            <span className="advisor-pertag-note">
                              — {log.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdvisorDashboard() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  // خروج: پاک‌کردن جلسه و بازگشت به صفحه‌ی ورود (نه صفحه‌ی معرفی)
  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [reminderText, setReminderText] = useState('');
  const [error, setError] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [builderState, setBuilderState] = useState(null);
  const [openPlanId, setOpenPlanId] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'calendar' | 'reports'
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [exams, setExams] = useState([]);
  const [examBuilderState, setExamBuilderState] = useState(null); // null | 'create' | { exam }
  const [gradingSubmission, setGradingSubmission] = useState(null); // null | { exam, submission }
  const [confirmState, setConfirmState] = useState(null); // { message, onConfirm, danger }
  // درخواست‌های دانش‌آموزان که منتظر تأیید مشاور هستند
  const [pendingRequests, setPendingRequests] = useState([]);
  const toast = useToast();
  const isSuperadmin = auth.user.role === 'SUPERADMIN';

  // آیتم‌های نوار پایین موبایل: سوپرادمین تب‌ها را عوض می‌کند، بقیه به بخش‌ها می‌پرند
  const navItems = useMemo(() => {
    if (isSuperadmin) {
      return [
        { key: 'students', label: 'دانش‌آموزها', icon: '👥', target: 'section-students' },
        { key: 'admin', label: 'مدیریت', icon: '⚙️', target: 'section-admin' },
      ];
    }
    return [
      { key: 'students', label: 'دانش‌آموزها', icon: '👥', target: 'section-students' },
      { key: 'reminders', label: 'یادآورها', icon: '✉️', target: 'section-reminders' },
      { key: 'plans', label: 'برنامه‌ها', icon: '🗓', target: 'section-plans' },
      { key: 'exams', label: 'آزمون‌ها', icon: '📝', target: 'section-exams' },
    ];
  }, [isSuperadmin]);

  function handleNavSelect(key, item) {
    const id = item?.target || key;
    if (key === 'admin') {
      setActiveTab('admin');
      return;
    }
    if (key === 'students' && activeTab !== 'students') {
      setActiveTab('students');
    }
    // بعد از رندر، اسکرول به بخش — برای تغییر تب هم rAF دوبل کافی است
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  useEffect(() => {
    fetchMyStudents()
      .then((data) => setStudents(data.students))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingStudents(false));
  }, [auth?.user?.id]);

  // بارگذاری درخواست‌های دانش‌آموزان (PENDING) — برای مدیریت تأیید/رد
  function loadPendingRequests() {
    fetchPendingStudentRequests()
      .then((data) => setPendingRequests(data.requests || []))
      .catch(() => setPendingRequests([]));
  }

  useEffect(() => {
    loadPendingRequests();
  }, [auth?.user?.id]);

  // قبول یک درخواست دانش‌آموز
  async function handleAcceptRequest(linkId, studentName) {
    try {
      await acceptStudentRequest(linkId);
      toast.success(`دانش‌آموز «${studentName}» قبول شد`);
      // حذف از لیست pending و اضافه به لیست فعال
      setPendingRequests((prev) => prev.filter((r) => r.id !== linkId));
      // بارگذاری مجدد دانش‌آموزان فعال
      fetchMyStudents()
        .then((data) => setStudents(data.students))
        .catch(() => {});
    } catch (err) {
      toast.error(err.message);
    }
  }

  // رد یک درخواست دانش‌آموز
  async function handleRejectRequest(linkId, studentName) {
    setConfirmState({
      message: `درخواست «${studentName}» رد شود؟ دانش‌آموز می‌تواند مشاور دیگری انتخاب کند.`,
      danger: true,
      confirmText: '✕ رد درخواست',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await rejectStudentRequest(linkId);
          toast.success(`درخواست «${studentName}» رد شد`);
          setPendingRequests((prev) => prev.filter((r) => r.id !== linkId));
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  async function selectStudent(student) {
    setSelectedStudent(student);
    setBuilderState(null);
    setOpenPlanId(null);
    setView('list');
    setEditingGoal(false);
    setExamBuilderState(null);
    setGradingSubmission(null);
    setLoadingDetail(true);
    setError('');
    try {
      const [plansData, remindersData, examsData] = await Promise.all([
        fetchStudentPlans(student.id),
        fetchRemindersForStudent(student.id),
        fetchExamsForStudent(student.id).catch(() => ({ exams: [] })),
      ]);
      setPlans(plansData.plans);
      setReminders(remindersData.reminders);
      setExams(examsData.exams || []);
      if (plansData.plans.length > 0) setOpenPlanId(plansData.plans[0].id);
      // تنظیم مقدار اولیه‌ی هدف هفتگی
      setGoalInput(student.weeklyGoalMinutes ? String(Math.round(student.weeklyGoalMinutes / 60)) : '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleFillQuote() {
    try {
      const data = await fetchRandomQuote();
      setReminderText(data.quote);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSendReminder(e) {
    e.preventDefault();
    if (!selectedStudent || !reminderText.trim()) return;
    setSending(true);
    setError('');
    try {
      const data = await sendReminder({
        studentId: selectedStudent.id,
        message: reminderText.trim(),
      });
      setReminders([data.reminder, ...reminders]);
      setReminderText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handlePlanSaved(plan) {
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === plan.id);
      if (idx === -1) return [plan, ...prev];
      const copy = [...prev];
      copy[idx] = plan;
      return copy;
    });
    setBuilderState(null);
    setOpenPlanId(plan.id);
  }

  async function handleDeletePlan(planId) {
    setConfirmState({
      message: 'این برنامه حذف شود؟ این کار قابل بازگشت نیست.',
      danger: true,
      confirmText: '🗑 حذف',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deletePlan(planId);
          setPlans((prev) => prev.filter((p) => p.id !== planId));
          toast.success('برنامه حذف شد');
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  async function handleDeleteReminder(reminderId) {
    setConfirmState({
      message: 'این یادآور حذف شود؟',
      danger: true,
      confirmText: '🗑 حذف',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteReminder(reminderId);
          setReminders((prev) => prev.filter((r) => r.id !== reminderId));
          toast.success('یادآور حذف شد');
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // ذخیره‌ی هدف هفتگی برای دانش‌آموز انتخاب‌شده
  async function handleSaveGoal() {
    const hours = parseInt(goalInput, 10);
    if (Number.isNaN(hours) || hours < 0 || hours > 168) {
      setError('ساعت هدف باید عددی بین ۰ و ۱۶۸ باشد');
      return;
    }
    const minutes = hours * 60;
    try {
      await setStudentWeeklyGoal(selectedStudent.id, minutes);
      setSelectedStudent({ ...selectedStudent, weeklyGoalMinutes: minutes });
      setStudents((prev) =>
        prev.map((s) => (s.id === selectedStudent.id ? { ...s, weeklyGoalMinutes: minutes } : s))
      );
      setEditingGoal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  // حذف آزمون
  async function handleDeleteExam(examId) {
    setConfirmState({
      message: 'این آزمون حذف شود؟',
      danger: true,
      confirmText: '🗑 حذف',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteExam(examId);
          setExams((prev) => prev.filter((e) => e.id !== examId));
          toast.success('آزمون حذف شد');
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // ذخیره‌ی آزمون (ساخت یا ویرایش) — در حالت گروهی آرایه‌ای از آزمون‌ها برمی‌گردد
  function handleExamSaved(saved) {
    const savedList = Array.isArray(saved) ? saved : [saved];
    setExams((prev) => {
      const next = [...prev];
      for (const exam of savedList) {
        const idx = next.findIndex((e) => e.id === exam.id);
        if (idx === -1) next.unshift(exam);
        else next[idx] = exam;
      }
      return next;
    });
    setExamBuilderState(null);
    if (savedList.length > 1) {
      toast.success(`آزمون برای ${savedList.length} دانش‌آموز ساخته شد`);
    }
  }

  // باز کردن مودال نمره‌دهی به یک ارسال
  async function handleOpenGrading(exam) {
    try {
      const data = await fetchExamSubmissions(exam.id);
      if (!data.submissions || data.submissions.length === 0) {
        setError('هنوز ارسالی برای این آزمون وجود ندارد');
        return;
      }
      setGradingSubmission({ exam: data.exam, submissions: data.submissions });
    } catch (err) {
      setError(err.message);
    }
  }

  const totalStudents = students.length;
  const totalPlans = plans.length;

  return (
    <div className="advisor-app">
      <AppHeader
        fullName={auth.user.fullName}
        greeting={auth.user.fullName}
        avatarClass="advisor-avatar"
        onOpenProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {/* اگر این مشاور نماینده‌ی (سردار) یک مؤسسه باشد، میان‌بر پنل مؤسسه را می‌بیند */}
      {auth.user.ledInstitute && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 20px 0' }}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => navigate('/institute')}
            title="پنل مدیریت مؤسسه"
          >
            🏫 پنل مؤسسه‌ی «{auth.user.ledInstitute.name}»
          </button>
        </div>
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <main className="page-body advisor-body">
        {error && (
          <div className="alert alert-error" onClick={() => setError('')}>
            <span>⚠</span> {error}
          </div>
        )}

        {isSuperadmin && (
          <div className="tab-row">
            <button
              className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <span aria-hidden>👥</span> دانش‌آموزها
            </button>
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <span aria-hidden>⚙</span> مدیریت مشاوران
            </button>
          </div>
        )}

        {activeTab === 'admin' && isSuperadmin && (
          <div id="section-admin">
            <AdminPanel />
          </div>
        )}

        {activeTab === 'students' && (
          <>
            {/* بخش درخواست‌های دانش‌آموزان (PENDING) */}
            {pendingRequests.length > 0 && (
              <section id="section-requests" className="card admin-section" style={{ marginBottom: 'var(--gap-md)' }}>
                <h3 className="card-title">
                  <span aria-hidden>📨</span> درخواست‌های دانش‌آموزان
                  <span className="badge-updated" style={{ marginInlineStart: 8 }}>
                    {toFaDigits(pendingRequests.length)} جدید
                  </span>
                </h3>
                <p className="muted-text" style={{ marginBottom: 12 }}>
                  این دانش‌آموزان می‌خواهند به تو متصل شوند. بعد از تأیید، می‌توانی برایشان برنامه و آزمون بسازی.
                </p>
                <div className="institute-advisor-list">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="student-request-card">
                      <div className="student-request-avatar">
                        {req.student.photoUrl ? (
                          <img
                            src={req.student.photoUrl}
                            alt=""
                            className="student-request-photo"
                          />
                        ) : (
                          (req.student.fullName || '؟').charAt(0)
                        )}
                      </div>
                      <div className="student-request-body">
                        <span className="student-request-name">{req.student.fullName}</span>
                        <div className="student-request-meta">
                          {req.student.field && (
                            <span>
                              {req.student.field === 'HUMANITIES' ? '📚 علوم انسانی'
                                : req.student.field === 'MATH_PHYSICS' ? '📐 ریاضی و فیزیک'
                                : '🧪 علوم تجربی'}
                            </span>
                          )}
                          <span>🕐 {formatRelativeTime(req.createdAt)}</span>
                          {req.student.phone && (
                            <a href={`tel:${req.student.phone}`} dir="ltr" onClick={(e) => e.stopPropagation()}>
                              📞 {toFaDigits(req.student.phone)}
                            </a>
                          )}
                        </div>
                        {/* ایمیل + عکس پروفایل در کارت درخواست — سواد تصمیم‌گیری مشاور */}
                        <a
                          href={`mailto:${req.student.email}`}
                          className="student-request-email"
                          dir="ltr"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📧 {req.student.email}
                        </a>
                        {req.student.bio && (
                          <p className="student-request-bio">{req.student.bio}</p>
                        )}
                      </div>
                      <div className="student-request-actions">
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleAcceptRequest(req.id, req.student.fullName)}
                        >
                          ✓ قبول
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleRejectRequest(req.id, req.student.fullName)}
                        >
                          ✕ رد
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="stats-grid">
              <StatCard icon="👥" label="دانش‌آموزها" value={toFaDigits(totalStudents)} accent="indigo" />
              <StatCard icon="📋" label="برنامه‌های این دانش‌آموز" value={toFaDigits(totalPlans)} accent="amber" />
            </section>

            <div className="two-column">
              <StudentListSidebar
                id="section-students"
                students={students}
                selectedId={selectedStudent?.id}
                loading={loadingStudents}
                onSelect={selectStudent}
              />

              <main>
                {!selectedStudent && (
                  <div className="empty-card big empty-guide">
                    <span className="empty-arrow" aria-hidden />
                    <p>یک دانش‌آموز را از فهرست انتخاب کن.</p>
                  </div>
                )}

                {selectedStudent && loadingDetail && (
                  <div className="loading-state">
                    <div className="spinner" />
                    <p>در حال بارگذاری…</p>
                  </div>
                )}

                {selectedStudent && !loadingDetail && (
                  <div className="detail-stack">
                    {/* بخش اطلاعات تماس دانش‌آموز */}
                    <StudentContactInfo student={selectedStudent} />

                    {/* بخش هدف هفتگی */}
                    <section className="card goal-card">
                      <h3 className="card-title">
                        <span aria-hidden>🎯</span> هدف ساعت مطالعه‌ی هفتگی
                      </h3>
                      {!editingGoal ? (
                        <div className="goal-display">
                          <p className="goal-current">
                            {selectedStudent.weeklyGoalMinutes
                              ? `هدف فعلی: ${toFaDigits(Math.round(selectedStudent.weeklyGoalMinutes / 60))} ساعت در هفته`
                              : 'هنوز هدفی تعیین نشده.'}
                          </p>
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setGoalInput(selectedStudent.weeklyGoalMinutes ? String(Math.round(selectedStudent.weeklyGoalMinutes / 60)) : '');
                              setEditingGoal(true);
                            }}
                          >
                            ✎ ویرایش هدف
                          </button>
                        </div>
                      ) : (
                        <div className="goal-edit">
                          <label className="goal-input-label">
                            ساعت مطالعه در هفته
                            <FaNumberInput
                              value={goalInput}
                              onChange={(v) => setGoalInput(v)}
                              placeholder="مثلاً ۲۰"
                            />
                          </label>
                          <div className="goal-edit-actions">
                            <button className="btn-primary" onClick={handleSaveGoal}>
                              ذخیره
                            </button>
                            <button className="btn-ghost" onClick={() => setEditingGoal(false)}>
                              انصراف
                            </button>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* بخش فرستادن یادآور */}
                    <section id="section-reminders" className="card reminder-card">
                      <h3 className="card-title">
                        <span aria-hidden>✉</span> فرستادن یادآور به {selectedStudent.fullName}
                      </h3>
                      <form onSubmit={handleSendReminder} className="reminder-form">
                        <textarea
                          rows={3}
                          value={reminderText}
                          onChange={(e) => setReminderText(e.target.value)}
                          placeholder="متن یادآور را بنویس یا از جمله‌ی انگیزشی استفاده کن…"
                        />
                        <div className="reminder-actions">
                          <button type="button" className="btn-secondary" onClick={handleFillQuote}>
                            <span aria-hidden>✨</span> جمله‌ی انگیزشی
                          </button>
                          <button type="submit" className="btn-primary" disabled={sending || !reminderText.trim()}>
                            {sending ? 'در حال ارسال…' : '📤 ارسال'}
                          </button>
                        </div>
                      </form>

                      <div className="reminder-list">
                        {reminders.length === 0 && (
                          <p className="muted-text">تا الان یادآوری برای این دانش‌آموز نفرستاده‌ای.</p>
                        )}
                        {reminders.map((r) => (
                          <div key={r.id} className="reminder-card-mini">
                            <div className="reminder-avatar">💬</div>
                            <div className="reminder-content">
                              <p className="reminder-text">{r.message}</p>
                              <span className="reminder-time" title={formatJalaliDate(r.createdAt)}>
                                {formatRelativeTime(r.createdAt)}
                              </span>
                            </div>
                            <button
                              className="btn-icon-only"
                              title="حذف یادآور"
                              onClick={() => handleDeleteReminder(r.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* بخش برنامه‌ها */}
                    <section id="section-plans">
                      <div className="section-head with-tabs">
                        <h3 className="section-title">
                          <span className="section-emoji">🗓</span>
                          برنامه‌های {selectedStudent.fullName}
                        </h3>
                        {!builderState && (
                          <button className="btn-primary" onClick={() => setBuilderState('create')}>
                            <span aria-hidden>+</span> ساخت برنامه‌ی جدید
                          </button>
                        )}
                      </div>

                      {/* تب‌های نمایش برنامه‌ها */}
                      {plans.length > 0 && !builderState && (
                        <div className="view-tabs">
                          <button
                            className={`tab-btn-sm ${view === 'list' ? 'active' : ''}`}
                            onClick={() => setView('list')}
                          >
                            📋 لیست
                          </button>
                          <button
                            className={`tab-btn-sm ${view === 'reports' ? 'active' : ''}`}
                            onClick={() => setView('reports')}
                          >
                            📊 آمار
                          </button>
                        </div>
                      )}

                      {builderState && (
                        <div className="builder-wrap">
                          <PlanBuilder
                            studentId={selectedStudent.id}
                            existingPlan={builderState === 'create' ? null : builderState.plan}
                            onSaved={handlePlanSaved}
                            onCancel={() => setBuilderState(null)}
                          />
                        </div>
                      )}

                      {plans.length === 0 && !builderState && (
                        <div className="empty-card">
                          <span className="empty-emoji" aria-hidden>📋</span>
                          <p>هنوز برنامه‌ای برای این دانش‌آموز نساخته‌ای.</p>
                        </div>
                      )}

                      {plans.length > 0 && !builderState && view === 'list' && (
                        <div className="plans-list">
                          {plans.map((plan) => {
                            const progress = computeProgress(plan);
                            const isOpen = openPlanId === plan.id || plans.length === 1;
                            return (
                              <div key={plan.id} className={`plan-card ${isOpen ? 'is-open' : ''}`}>
                                <div className="plan-card-header">
                                  <button
                                    className="plan-card-toggle"
                                    onClick={() => setOpenPlanId(isOpen ? null : plan.id)}
                                  >
                                    <div className="plan-card-title-wrap">
                                      <h4 className="plan-title">{plan.title}</h4>
                                      {plan.note && <p className="plan-note">{plan.note}</p>}
                                      <p className="plan-dates">
                                        <span className="date-chip">از {formatJalaliShort(plan.startsAt)}</span>
                                        {plan.expiresAt && (
                                          <span className="date-chip">تا {formatJalaliShort(plan.expiresAt)}</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="plan-progress-mini">
                                      <div className="ring-progress" style={{ '--p': `${progress}%` }}>
                                        <span>{toFaDigits(progress)}٪</span>
                                      </div>
                                      <span className="chevron">{isOpen ? '▾' : '▸'}</span>
                                    </div>
                                  </button>
                                  <div className="plan-actions">
                                    <button
                                      className="btn-icon edit"
                                      title="ویرایش"
                                      onClick={() => setBuilderState({ plan })}
                                      disabled={!!builderState}
                                    >
                                      ✎
                                    </button>
                                    <button
                                      className="btn-icon danger"
                                      title="حذف"
                                      onClick={() => handleDeletePlan(plan.id)}
                                      disabled={!!builderState}
                                    >
                                      🗑
                                    </button>
                                  </div>
                                </div>

                                {isOpen && (
                                  <div className="plan-body">
                                    <div className="progress-block">
                                      <div className="progress-labels">
                                        <span className="muted-text">پیشرفت کلی</span>
                                        <span className="muted-text">{toFaDigits(progress)}٪</span>
                                      </div>
                                      <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                                      </div>
                                    </div>

                                    <div className="days-stack">
                                      {plan.days.map((day) => (
                                        <AdvisorDayBlock key={day.id} day={day} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {plans.length > 0 && !builderState && view === 'reports' && (
                        <Reports plans={plans} weeklyGoalMinutes={selectedStudent.weeklyGoalMinutes} />
                      )}
                    </section>

                    {/* بخش آزمون‌ها */}
                    <section id="section-exams" className="exams-section">
                      <div className="section-head">
                        <h3 className="section-title">
                          <span className="section-emoji">📝</span>
                          آزمون‌های {selectedStudent.fullName}
                        </h3>
                        {!examBuilderState && (
                          <button className="btn-primary" onClick={() => setExamBuilderState('create')}>
                            <span aria-hidden>+</span> ساخت آزمون
                          </button>
                        )}
                      </div>

                      {examBuilderState && (
                        <div className="builder-wrap">
                          <ExamBuilder
                            studentId={selectedStudent.id}
                            students={students}
                            existingExam={examBuilderState === 'create' ? null : examBuilderState.exam}
                            onSaved={handleExamSaved}
                            onCancel={() => setExamBuilderState(null)}
                          />
                        </div>
                      )}

                      {!examBuilderState && exams.length === 0 && (
                        <div className="empty-card">
                          <span className="empty-emoji" aria-hidden>📝</span>
                          <p>هنوز آزمونی برای این دانش‌آموز نساخته‌ای.</p>
                        </div>
                      )}

                      {!examBuilderState && exams.map((exam) => {
                        // وضعیت نمره‌دهی بر اساس ارسال‌های این آزمون (تک‌دانش‌آموزی)
                        const subs = exam.submissions || [];
                        const graded = subs.filter((s) => s.status === 'GRADED').length;
                        const submitted = subs.filter((s) => s.status === 'SUBMITTED').length;
                        const hasDescriptive = (exam.questions || []).some(
                          (q) => q.type === 'DESCRIPTIVE'
                        );
                        const allGraded = subs.length > 0 && graded === subs.length;
                        return (
                        <div key={exam.id} className="card exam-card">
                          <div className="exam-card-head">
                            <div>
                              <h4 className="exam-title">{exam.title}</h4>
                              {exam.description && <p className="muted-text">{exam.description}</p>}
                              <div className="exam-meta">
                                <span>⏱ {toFaDigits(exam.durationMinutes)} دقیقه</span>
                                <span>📝 {toFaDigits(exam.questions?.length || 0)} سؤال</span>
                                {hasDescriptive && (
                                  <span className="exam-meta-tag desc">شامل تشریحی</span>
                                )}
                                <span className={`exam-visibility ${exam.visibleToStudent ? 'visible' : 'hidden'}`}>
                                  {exam.visibleToStudent
                                    ? '🔍 قابل مشاهده'
                                    : exam.visibleFrom
                                      ? `🔒 تا ${formatJalaliDate(exam.visibleFrom, { withYear: false })}`
                                      : '🔒 تا زمان شروع'}
                                </span>
                              </div>
                              <p className="muted-text">
                                📅 {formatJalaliDateTime(exam.scheduledAt)}
                              </p>
                            </div>
                            <div className="exam-actions exam-actions-col">
                              {/* وضعیت واضح + یک اقدام اصلی */}
                              {allGraded ? (
                                <>
                                  <span className="exam-status-pill graded">
                                    ✅ نمره داده شد: {toFaDigits(subs[0]?.totalScore)} از {toFaDigits(subs[0]?.maxScore)}
                                  </span>
                                  <button
                                    className="btn-secondary btn-sm"
                                    onClick={() => handleOpenGrading(exam)}
                                  >
                                    👁 مشاهده پاسخ‌برگ
                                  </button>
                                </>
                              ) : submitted > 0 ? (
                                <>
                                  <span className="exam-status-pill needs-grading">
                                    ✍️ {toFaDigits(submitted)} ارسال در انتظار نمره‌دهی
                                  </span>
                                  <button
                                    className="btn-primary"
                                    onClick={() => handleOpenGrading(exam)}
                                  >
                                    {hasDescriptive ? '📝 نمره‌دهی تشریحی‌ها' : '📋 مشاهده پاسخ‌ها'}
                                  </button>
                                </>
                              ) : subs.length > 0 ? (
                                <span className="exam-status-pill progress">
                                  ⏳ دانش‌آموز در حال آزمون دادن است
                                </span>
                              ) : (
                                <span className="exam-status-pill waiting">
                                  ⌛ هنوز شروع نشده
                                </span>
                              )}
                              <div className="exam-actions-row">
                                <button
                                  className="btn-icon edit"
                                  title="ویرایش"
                                  onClick={() => setExamBuilderState({ exam })}
                                  disabled={!!examBuilderState}
                                >
                                  ✎
                                </button>
                                <button
                                  className="btn-icon danger"
                                  title="حذف"
                                  onClick={() => handleDeleteExam(exam.id)}
                                  disabled={!!examBuilderState}
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </section>

                    {/* مودال نمره‌دهی */}
                    {gradingSubmission && (
                      <GradingModal
                        data={gradingSubmission}
                        onClose={() => setGradingSubmission(null)}
                        onGrade={async (submissionId, payload) => {
                          await gradeSubmission(submissionId, payload);
                        }}
                      />
                    )}
                  </div>
                )}
              </main>
            </div>
          </>
        )}
      </main>

      {/* مودال تأیید */}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          danger={confirmState.danger}
          confirmText={confirmState.confirmText}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      <MobileNav items={navItems} onSelect={handleNavSelect} />
    </div>
  );
}
