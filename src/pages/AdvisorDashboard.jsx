import { useEffect, useMemo, useState, useRef } from 'react';
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
  fetchPendingStudentRequests,
  acceptStudentRequest,
  rejectStudentRequest,
  updatePlan,
  fetchStudyEntriesForStudent,
  fetchSubjectProgressForStudent,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { toFaDigits } from '../utils/jalali';
import MockExamsCard from '../components/MockExamsCard';
import ExamScheduleCard from '../components/student/ExamScheduleCard';
import AdminPanel from '../components/AdminPanel';
import ProfileModal from '../components/ProfileModal';
import RegistrationCompleteModal from '../components/RegistrationCompleteModal';
import ConfirmModal from '../components/ConfirmModal';
import AppHeader from '../components/AppHeader';
import StatCard from '../components/StatCard';
import StudentPicker from '../components/advisor/StudentPicker';
import AdvisorInviteCard from '../components/advisor/AdvisorInviteCard';
import ExamRangePlanModal from '../components/advisor/ExamRangePlanModal';
import GradingModal from '../components/advisor/GradingModal';
import usePanelSection from '../hooks/usePanelSection';
import Ico from '../components/Ico';
import { listDrafts } from '../utils/drafts';

import AdvisorPlansSection from '../components/advisor/AdvisorPlansSection';
import AdvisorProfileSection from '../components/advisor/AdvisorProfileSection';
import AdvisorExamsSection from '../components/advisor/AdvisorExamsSection';
import AdvisorPendingRequestsSection from '../components/advisor/AdvisorPendingRequestsSection';

export default function AdvisorDashboard() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isSuperadmin = auth.user.role === 'SUPERADMIN';

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
  const [builderState, setBuilderState] = useState(null);
  const [openPlanId, setOpenPlanId] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'reports' | 'free'
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [exams, setExams] = useState([]);
  const [examBuilderState, setExamBuilderState] = useState(null);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [entries, setEntries] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const pendingCountRef = useRef(null);
  const [showExamRange, setShowExamRange] = useState(false);

  const STUDENT_SECTIONS = ['profile', 'plans', 'exams', 'school', 'mock'];
  const SECTION_KEYS = [
    'students', 'requests', ...STUDENT_SECTIONS, ...(isSuperadmin ? ['admin'] : []),
  ];
  const [section, setSection] = usePanelSection(SECTION_KEYS, 'students');

  const menuItems = useMemo(() => {
    const need = 'اول یک دانش‌آموز انتخاب کن';
    const forStudent = (item) => ({ ...item, disabled: !selectedStudent, hint: selectedStudent ? item.hint : need });
    return [
      {
        key: 'students', label: 'دانش‌آموزها', icon: '👥',
        hint: selectedStudent ? `انتخاب‌شده: ${selectedStudent.fullName}` : 'فهرست دانش‌آموزان و لینک دعوت',
      },
      { key: 'requests', label: 'درخواست‌های جدید', icon: '📨', badge: pendingRequests.length, hint: 'دانش‌آموزانی که خودشان تو را انتخاب کرده‌اند' },
      forStudent({ key: 'profile', label: 'مرور اجمالی', icon: '👤', divider: true, hint: 'خلاصه‌ی وضعیت، هدف، یادآور و یادداشت‌های خصوصی' }),
      forStudent({ key: 'plans', label: 'برنامه‌ها', icon: '🗓', hint: 'ساخت، ویرایش و انتشار برنامه‌ی هفتگی' }),
      forStudent({ key: 'exams', label: 'آزمون‌ها', icon: '📝', hint: 'ساخت آزمون و نمره‌دهی' }),
      forStudent({ key: 'school', label: 'امتحان‌های مدرسه', icon: '🏫', hint: 'امتحان‌های ثبت‌شده‌ی دانش‌آموز و ساخت برنامه از آن‌ها' }),
      forStudent({ key: 'mock', label: 'کارنامه‌ی آزمایشی', icon: '📈', hint: 'تراز و درصد آزمون‌های آزمایشی بیرونی' }),
      ...(isSuperadmin ? [{ key: 'admin', label: 'مدیریت مشاوران', icon: '⚙️', divider: true, hint: 'تأیید مشاوران، سقف‌ها، اشتراک و آموزشگاه‌ها' }] : []),
    ];
  }, [isSuperadmin, selectedStudent, pendingRequests.length]);

  const inStudentSection = !!selectedStudent && STUDENT_SECTIONS.includes(section);
  useEffect(() => {
    if (inStudentSection) window.dispatchEvent(new CustomEvent('dz:enteredstudentsection'));
  }, [inStudentSection]);

  useEffect(() => {
    const recheck = () => {
      if (inStudentSection) window.dispatchEvent(new CustomEvent('dz:recheckstudentsection'));
    };
    window.addEventListener('dz:recheckstudentsection', recheck);
    return () => window.removeEventListener('dz:recheckstudentsection', recheck);
  }, [inStudentSection]);

  useEffect(() => {
    const onSection = (e) => {
      const key = e.detail?.key;
      if (key === '__default') {
        setSection('students');
        e.detail.ok = true;
        return;
      }
      if (!SECTION_KEYS.includes(key)) return;
      if (STUDENT_SECTIONS.includes(key) && !selectedStudent) return;
      setSection(key);
      e.detail.ok = true;
    };
    window.addEventListener('dz:panelsection', onSection);
    return () => window.removeEventListener('dz:panelsection', onSection);
  });

  useEffect(() => {
    const onTourForm = (e) => {
      const form = e.detail?.form;
      if (form === 'profile') {
        setShowProfile(true);
        e.detail.ok = true;
      } else if (form === 'plan-builder' && selectedStudent) {
        setShowProfile(false);
        setSection('plans');
        setView('list');
        setBuilderState('create');
        e.detail.ok = true;
      } else if (form === 'exam-builder' && selectedStudent) {
        setShowProfile(false);
        setSection('exams');
        setExamBuilderState('create');
        e.detail.ok = true;
      } else if (form === null) {
        setShowProfile(false);
        setBuilderState(null);
        setExamBuilderState(null);
      }
    };
    window.addEventListener('dz:tourform', onTourForm);
    return () => window.removeEventListener('dz:tourform', onTourForm);
  });

  useEffect(() => {
    fetchMyStudents()
      .then((data) => setStudents(data.students))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingStudents(false));
  }, [auth?.user?.id]);

  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || loadingStudents || students.length === 0 || !auth?.user?.id) return;
    resumedRef.current = true;
    const drafts = [
      ...listDrafts(auth.user.id, 'plan:'),
      ...listDrafts(auth.user.id, 'exam:'),
    ].sort((a, b) => b.savedAt - a.savedAt);
    for (const d of drafts) {
      const [kind, studentId, id] = d.scope.split(':');
      const st = students.find((x) => String(x.id) === studentId && x.isActive !== false);
      if (st) {
        selectStudent(st, { kind, id });
        setSection(kind === 'plan' ? 'plans' : 'exams');
        break;
      }
    }
  }, [loadingStudents, students, auth?.user?.id, setSection]);

  function loadPendingRequests() {
    fetchPendingStudentRequests()
      .then((data) => setPendingRequests(data.requests || []))
      .catch(() => setPendingRequests([]));
  }

  useEffect(() => {
    loadPendingRequests();
  }, [auth?.user?.id]);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      fetchPendingStudentRequests()
        .then((data) => {
          const list = data.requests || [];
          if (pendingCountRef.current !== null && list.length > pendingCountRef.current) {
            toast.info('درخواست جدیدی از یک دانش‌آموز رسید');
          }
          setPendingRequests(list);
        })
        .catch(() => {});
    };
    const id = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [auth?.user?.id, toast]);

  useEffect(() => {
    pendingCountRef.current = pendingRequests.length;
  }, [pendingRequests.length]);

  async function handleAcceptRequest(linkId, studentName) {
    try {
      await acceptStudentRequest(linkId);
      toast.success(`دانش‌آموز «${studentName}» قبول شد`);
      setPendingRequests((prev) => prev.filter((r) => r.id !== linkId));
      fetchMyStudents()
        .then((data) => setStudents(data.students))
        .catch(() => {});
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRejectRequest(linkId, studentName) {
    setConfirmState({
      message: `درخواست «${studentName}» رد شود؟ دانش‌آموز می‌تواند مشاور دیگری انتخاب کند.`,
      danger: true,
      confirmText: 'رد درخواست',
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

  async function selectStudent(student, resume = null) {
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
      const [plansData, remindersData, examsData, entriesData, progressData] = await Promise.all([
        fetchStudentPlans(student.id),
        fetchRemindersForStudent(student.id),
        fetchExamsForStudent(student.id).catch(() => ({ exams: [] })),
        fetchStudyEntriesForStudent(student.id).catch(() => ({ entries: [] })),
        fetchSubjectProgressForStudent(student.id).catch(() => ({ progress: [] })),
      ]);
      setPlans(plansData.plans || []);
      setEntries(entriesData.entries || []);
      setProgressRows(progressData.progress || []);
      setReminders(remindersData.reminders || []);
      setExams(examsData.exams || []);
      if (plansData.plans?.length > 0) setOpenPlanId(plansData.plans[0].id);
      if (resume?.kind === 'plan') {
        if (resume.id === 'new') setBuilderState('create');
        else {
          const p = plansData.plans.find((x) => String(x.id) === resume.id);
          if (p) setBuilderState({ plan: p });
        }
      } else if (resume?.kind === 'exam') {
        if (resume.id === 'new') setExamBuilderState('create');
        else {
          const ex = (examsData.exams || []).find((x) => String(x.id) === resume.id);
          if (ex) setExamBuilderState({ exam: ex });
        }
      }
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
      toast.success('یادآور ارسال شد');
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
      confirmText: 'حذف',
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

  async function handlePublishDraft(planId) {
    try {
      const data = await updatePlan(planId, { isDraft: false });
      setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
      toast.success('برنامه برای دانش‌آموز منتشر شد');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleDraftsCreated(data) {
    setPlans((prev) => [...data.plans, ...prev]);
    setShowExamRange(false);
    setOpenPlanId(data.plans[0]?.id || null);
    setView('list');
    setSection('plans');
    toast.success(`${toFaDigits(data.plans.length)} پیش‌نویس برنامه ساخته شد؛ ویرایش و منتشر کن`);
  }

  async function handleDeleteReminder(reminderId) {
    setConfirmState({
      message: 'این یادآور حذف شود؟',
      danger: true,
      confirmText: 'حذف',
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
      toast.success('هدف هفتگی ذخیره شد');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteExam(examId) {
    setConfirmState({
      message: 'این آزمون حذف شود؟',
      danger: true,
      confirmText: 'حذف',
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

  const activeStudents = students.filter((st) => st.isActive !== false);
  const totalStudents = activeStudents.length;

  return (
    <div className="advisor-app">
      <AppHeader
        fullName={auth.user.fullName}
        greeting={auth.user.fullName}
        avatarClass="advisor-avatar"
        menuItems={menuItems}
        activeMenu={section}
        onMenuSelect={(key) => setSection(key)}
        menuTitle={isSuperadmin ? 'پنل مدیریت' : 'پنل مشاور'}
        onOpenProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {auth.user.ledInstitute && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 20px 0' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => navigate('/institute')}
            title="پنل مدیریت مؤسسه"
          >
            <Ico e="🏫" /> پنل مؤسسه‌ی «{auth.user.ledInstitute.name}»
          </button>
        </div>
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {auth.user.registrationComplete === false && auth.user.role === 'ADVISOR' && (
        <RegistrationCompleteModal role="ADVISOR" />
      )}

      <main className="page-body advisor-body">
        {error && (
          <div className="alert alert-error" onClick={() => setError('')}>
            <span><Ico e="⚠" /></span> {error}
          </div>
        )}

        {/* بخش فهرست دانش‌آموزان */}
        {section === 'students' && (
          <>
            <section className="stats-grid">
              <StatCard icon="👥" label="دانش‌آموزها" value={toFaDigits(totalStudents)} accent="indigo" />
              <StatCard icon="📨" label="درخواست‌های جدید" value={toFaDigits(pendingRequests.length)} accent="amber" />
              <StatCard icon="🎯" label="بدون هدف هفتگی" value={toFaDigits(activeStudents.filter((st) => !st.weeklyGoalMinutes).length)} accent="pink" />
            </section>

            {students.length === 0 && !loadingStudents && (
              <div className="empty-card big" style={{ margin: 'var(--gap-lg) 0' }}>
                <span className="empty-emoji" aria-hidden><Ico e="👥" /></span>
                <p>هنوز دانش‌آموزی نداری. لینک دعوت اختصاصی‌ات را برای شاگردانت بفرست.</p>
              </div>
            )}

            <AdvisorInviteCard />

            {pendingRequests.length > 0 && (
              <AdvisorPendingRequestsSection
                pendingRequests={pendingRequests}
                handleAcceptRequest={handleAcceptRequest}
                handleRejectRequest={handleRejectRequest}
              />
            )}

            <StudentPicker
              students={students}
              selectedStudent={selectedStudent}
              onSelect={(student) => {
                selectStudent(student);
                setSection('profile');
              }}
              loading={loadingStudents}
            />
          </>
        )}

        {/* صفحه‌های بخش‌های وابسته به دانش‌آموز: نوار دانش‌آموز انتخاب‌شده + محتوا */}
        {STUDENT_SECTIONS.includes(section) && (
          <>
            {!selectedStudent && (
              <div className="empty-card big empty-guide">
                <span className="empty-emoji" aria-hidden><Ico e="👥" /></span>
                <p>برای دیدن این بخش، اول یک دانش‌آموز را انتخاب کن.</p>
                <button type="button" className="btn-primary" onClick={() => setSection('students')}>
                  رفتن به فهرست دانش‌آموزها
                </button>
              </div>
            )}

            {selectedStudent && (
              <div className="selected-student-bar">
                <span className="selected-student-name">
                  <Ico e="🎒" /> {selectedStudent.fullName}
                </span>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setSection('students')}>
                  <Ico e="🔄" /> تغییر دانش‌آموز
                </button>
              </div>
            )}

            {selectedStudent && loadingDetail && (
              <div className="loading-state">
                <div className="spinner" />
                <p>در حال بارگذاری اطلاعات دانش‌آموز…</p>
              </div>
            )}
          </>
        )}

        {selectedStudent && !loadingDetail && (
          <div className="detail-stack">
            {section === 'profile' && (
              <AdvisorProfileSection
                userId={auth.user.id}
                selectedStudent={selectedStudent}
                plans={plans}
                entries={entries}
                progressRows={progressRows}
                editingGoal={editingGoal}
                setEditingGoal={setEditingGoal}
                goalInput={goalInput}
                setGoalInput={setGoalInput}
                handleSaveGoal={handleSaveGoal}
                reminderText={reminderText}
                setReminderText={setReminderText}
                handleFillQuote={handleFillQuote}
                handleSendReminder={handleSendReminder}
                sending={sending}
                reminders={reminders}
                handleDeleteReminder={handleDeleteReminder}
              />
            )}

            {section === 'plans' && (
              <AdvisorPlansSection
                userId={auth.user.id}
                selectedStudent={selectedStudent}
                plans={plans}
                entries={entries}
                progressRows={progressRows}
                view={view}
                setView={setView}
                builderState={builderState}
                setBuilderState={setBuilderState}
                openPlanId={openPlanId}
                setOpenPlanId={setOpenPlanId}
                handlePlanSaved={handlePlanSaved}
                handlePublishDraft={handlePublishDraft}
                handleDeletePlan={handleDeletePlan}
              />
            )}

            {section === 'exams' && (
              <AdvisorExamsSection
                userId={auth.user.id}
                selectedStudent={selectedStudent}
                students={students}
                exams={exams}
                examBuilderState={examBuilderState}
                setExamBuilderState={setExamBuilderState}
                handleExamSaved={handleExamSaved}
                handleOpenGrading={handleOpenGrading}
                handleDeleteExam={handleDeleteExam}
              />
            )}

            {section === 'school' && (
              <>
                <div className="school-actions">
                  <button type="button" className="btn-primary" data-tour="school-range" onClick={() => setShowExamRange(true)}>
                    <Ico e="🗓" /> ساخت برنامه از بازه‌ی امتحان‌ها
                  </button>
                  <span className="muted-text">
                    بازه‌ی روزهای امتحان را انتخاب کن تا پیش‌نویس برنامه‌ی آمادگی خودکار ساخته شود.
                  </span>
                </div>
                <ExamScheduleCard studentId={selectedStudent.id} compact />
              </>
            )}

            {section === 'mock' && (
              <MockExamsCard studentId={selectedStudent.id} compact />
            )}
          </div>
        )}

        {section === 'requests' && (
          <AdvisorPendingRequestsSection
            pendingRequests={pendingRequests}
            handleAcceptRequest={handleAcceptRequest}
            handleRejectRequest={handleRejectRequest}
          />
        )}

        {isSuperadmin && section === 'admin' && (
          <AdminPanel />
        )}
      </main>

      {/* مودال ساخت برنامه از بازه‌ی امتحان‌ها */}
      {showExamRange && selectedStudent && (
        <ExamRangePlanModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.fullName}
          onClose={() => setShowExamRange(false)}
          onDraftsCreated={handleDraftsCreated}
        />
      )}

      {/* مودال نمره‌دهی به پاسخ‌های تشریحی */}
      {gradingSubmission && (
        <GradingModal
          exam={gradingSubmission.exam}
          submissions={gradingSubmission.submissions}
          onClose={() => setGradingSubmission(null)}
          onGraded={() => {
            if (selectedStudent) selectStudent(selectedStudent);
          }}
        />
      )}

      {/* مودال تأیید حذف */}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
