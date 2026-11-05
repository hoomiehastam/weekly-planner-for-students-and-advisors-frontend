import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMyPlans,
  fetchMyReminders,
  updateItemStatus,
  fetchNotificationSummary,
  markNotificationSeen,
  deleteReminder,
  fetchMyWeeklyGoal,
  fetchMyAdvisor,
  fetchMyExams,
  fetchRandomQuote,
  fetchMyStudyEntries,
  fetchMySubjectProgress,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { toFaDigits, formatRelativeTime } from '../utils/jalali';
import { loadOfflinePlans, saveOfflinePlans } from '../utils/offlineCache';
import AppHeader from '../components/AppHeader';
import StudentStatsSection from '../components/student/StudentStatsSection';
import RemindersSection from '../components/student/RemindersSection';
import ParentInviteCard from '../components/student/ParentInviteCard';
import FriendInviteCard from '../components/student/FriendInviteCard';
import MockExamsCard from '../components/MockExamsCard';
import PlanStudentCard from '../components/student/PlanStudentCard';
import ExamStudentCard from '../components/student/ExamStudentCard';
import ExamScheduleCard from '../components/student/ExamScheduleCard';
import FreeStudyCard from '../components/student/FreeStudyCard';
import SectionGuide from '../components/SectionGuide';
import WeeklyCalendarView from '../components/WeeklyCalendarView';
import Reports from '../components/Reports';
import ProfileModal from '../components/ProfileModal';
import RegistrationCompleteModal from '../components/RegistrationCompleteModal';
import ExamTaker from '../components/ExamTaker';
import ExamReview from '../components/student/ExamReview';
import ConfirmModal from '../components/ConfirmModal';
import usePanelSection from '../hooks/usePanelSection';
import Ico from '../components/Ico';

export default function StudentDashboard() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  // خروج: پاک‌کردن جلسه و بازگشت به صفحه‌ی ورود (نه صفحه‌ی معرفی)
  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  const [plans, setPlans] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({ unreadReminders: 0, updatedPlans: 0 });
  const [openPlanId, setOpenPlanId] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'calendar' | 'reports'
  const [weeklyGoal, setWeeklyGoal] = useState(null);
  const [advisor, setAdvisor] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [reviewExam, setReviewExam] = useState(null); // آزمون در حال مرور پاسخ‌ها
  const [confirmState, setConfirmState] = useState(null);
  const [quote, setQuote] = useState('');
  // وقتی اینترنت نیست و برنامه از آخرین نسخه‌ی ذخیره‌شده خوانده می‌شود: { savedAt }
  const [offlineInfo, setOfflineInfo] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // مطالعه‌ی آزاد (خارج از برنامه) و پیشروی دروس
  const [entries, setEntries] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  // آخرین بازدیدِ برنامه‌ها (از سرور) — برنامه‌ای که بعد از آن تغییر کرده «به‌روز شد» می‌خورد
  const [plansBaseline, setPlansBaseline] = useState(null);
  const plansVersionRef = useRef(null);
  const toast = useToast();
  // شیء toast در هر رندر تازه می‌شود؛ با ref نگهش می‌داریم تا بازخوانی خودکار هر لحظه ریست نشود
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });

  // بخش‌های پنل — هر کدام یک صفحه‌ی جدا که از منوی همبرگری باز می‌شود
  const SECTION_KEYS = ['home', 'plans', 'free', 'exams', 'school', 'mock', 'invite', 'parent'];
  const [section, setSection] = usePanelSection(SECTION_KEYS, 'home');

  // تور راهنما با این رویداد بخش‌ها را باز می‌کند تا عنصرهای داخلشان را روشن کند
  useEffect(() => {
    const onSection = (e) => {
      const key = e.detail?.key === '__default' ? 'home' : e.detail?.key;
      if (!SECTION_KEYS.includes(key)) return;
      setSection(key);
      e.detail.ok = true;
    };
    window.addEventListener('dz:panelsection', onSection);
    return () => window.removeEventListener('dz:panelsection', onSection);
  });

  // تور راهنما پروفایل را باز/بسته می‌کند (فرم‌های ثبت امتحان و نمره خودشان به همین رویداد جواب می‌دهند)
  useEffect(() => {
    const onTourForm = (e) => {
      const form = e.detail?.form;
      if (form === 'profile') {
        setShowProfile(true);
        e.detail.ok = true;
      } else if (form === 'school-form') {
        setShowProfile(false);
        setSection('school');
      } else if (form === 'mock-form') {
        setShowProfile(false);
        setSection('mock');
      } else if (form === null) {
        setShowProfile(false);
      }
    };
    window.addEventListener('dz:tourform', onTourForm);
    return () => window.removeEventListener('dz:tourform', onTourForm);
  });

  useEffect(() => {
    async function load() {
      try {
        const [plansData, remindersData, summary, goalData, advisorData, examsData, entriesData, progressData] = await Promise.all([
          fetchMyPlans(),
          fetchMyReminders(),
          fetchNotificationSummary(),
          fetchMyWeeklyGoal().catch(() => ({ weeklyGoalMinutes: null, linkStatus: null })),
          fetchMyAdvisor().catch(() => ({ advisor: null, linkStatus: null })),
          fetchMyExams().catch(() => ({ exams: [] })),
          fetchMyStudyEntries().catch(() => ({ entries: [] })),
          fetchMySubjectProgress().catch(() => ({ progress: [] })),
        ]);
        setPlans(plansData.plans);
        setEntries(entriesData.entries || []);
        setProgressRows(progressData.progress || []);
        plansVersionRef.current = summary.plansVersion ?? null;
        setPlansBaseline(summary.plansLastViewedAt || null);
        setOfflineInfo(null);
        // آخرین برنامه برای خواندن بدون اینترنت نگه داشته می‌شود
        saveOfflinePlans(auth?.user?.id, plansData.plans);
        setReminders(remindersData.reminders);
        setNotifications(summary);
        setWeeklyGoal(goalData.weeklyGoalMinutes);
        // وضعیت link را از advisorData می‌گیریم (اولویت دارد) وگرنه از goalData
        const linkStatus = advisorData.linkStatus || goalData.linkStatus || null;
        setAdvisor(advisorData.advisor ? { ...advisorData.advisor, linkStatus } : null);
        setExams(examsData.exams || []);
        if (plansData.plans.length > 0) setOpenPlanId(plansData.plans[0].id);

        // جمله‌ی انگیزشی روز — اگر شکست خورد، بی‌صدا رد می‌شود (اختیاری است)
        fetchRandomQuote()
          .then((q) => setQuote(q.quote || ''))
          .catch(() => {});

      } catch (err) {
        // نبودن اینترنت: برنامه‌ی ذخیره‌شده‌ی آخرین بار نمایش داده می‌شود (فقط‌خواندنی)
        const cached = err?.isNetworkError ? loadOfflinePlans(auth?.user?.id) : null;
        if (cached) {
          setPlans(cached.plans);
          setOfflineInfo({ savedAt: cached.savedAt });
          if (cached.plans.length > 0) setOpenPlanId(cached.plans[0].id);
          setError('');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auth?.user?.id, reloadKey]);

  // بازخوانی خودکار برنامه‌ها: وقتی مشاور برنامه را عوض می‌کند، دانش‌آموزی که پنل را باز گذاشته
  // (مخصوصاً برنامه‌ی نصب‌شده) بدون رفرش دستی تغییر را می‌بیند. هر ۴۵ ثانیه و هر بار که
  // صفحه دوباره دیده می‌شود، فقط «اثر انگشتِ» برنامه‌ها پرسیده می‌شود (سبک)؛ فقط اگر عوض شده بود
  // برنامه‌ها دوباره خوانده می‌شوند.
  const refreshPlans = useCallback(async ({ force = false } = {}) => {
    try {
      const summary = await fetchNotificationSummary();
      const changed = summary.plansVersion !== plansVersionRef.current;
      setNotifications((n) => ({ ...n, unreadReminders: summary.unreadReminders, updatedPlans: summary.updatedPlans }));
      if (!changed && !force) return;
      const data = await fetchMyPlans();
      const hadVersion = plansVersionRef.current !== null;
      plansVersionRef.current = summary.plansVersion;
      setPlans(data.plans);
      setPlansBaseline((b) => b || summary.plansLastViewedAt || null);
      saveOfflinePlans(auth?.user?.id, data.plans);
      if (changed && hadVersion) toastRef.current.info('مشاورت برنامه‌ات را به‌روز کرد');
    } catch {
      /* بی‌اینترنت یا خطای گذرا؛ دور بعد دوباره */
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    if (loading || offlineInfo) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') refreshPlans(); };
    const id = setInterval(tick, 45000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [loading, offlineInfo, refreshPlans]);

  // با ورود به صفحه‌ی برنامه‌ها همیشه تازه‌ترین نسخه خوانده می‌شود
  useEffect(() => {
    if (!loading && !offlineInfo && section === 'plans') refreshPlans({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // به‌محض وصل‌شدن اینترنت، اطلاعات تازه از سرور گرفته می‌شود
  useEffect(() => {
    if (!offlineInfo) return undefined;
    const onOnline = () => setReloadKey((k) => k + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [offlineInfo]);

  // وقتی کاربر وارد صفحه‌ی «یادآورها» یا «برنامه‌ها» می‌شود، همان اعلان‌ها «خوانده‌شده» می‌شوند.
  // با خروج از صفحه، نشانگر عددی منو هم صفر می‌شود (تا هنگام باز بودن صفحه، برچسب‌های «جدید» دیده شوند).
  useEffect(() => {
    if (loading || offlineInfo) return undefined;
    // «مرور اجمالی» یادآورها را هم نشان می‌دهد؛ دیدنش یادآورها را «خوانده‌شده» می‌کند
    if (section !== 'home' && section !== 'plans') return undefined;
    const kind = section === 'home' ? 'reminders' : 'plans';
    markNotificationSeen(kind).catch(() => {});
    return () => {
      setNotifications((n) => (
        kind === 'reminders' ? { ...n, unreadReminders: 0 } : { ...n, updatedPlans: 0 }
      ));
      // با خروج از صفحه‌ی برنامه‌ها، «به‌روز شد»ها دیده‌شده حساب می‌شوند
      if (kind === 'plans') setPlansBaseline(new Date().toISOString());
    };
  }, [section, loading, offlineInfo]);

  const menuItems = useMemo(
    () => [
      { key: 'home', label: 'مرور اجمالی', icon: '🏠', hint: 'پیشرفت، هدف هفتگی و یادآورهای مشاور', badge: notifications.unreadReminders },
      { key: 'plans', label: 'برنامه‌های مطالعاتی', icon: '🗓', badge: notifications.updatedPlans, hint: 'درس‌های هر روز را تیک بزن' },
      { key: 'free', label: 'مطالعه‌ی آزاد', icon: '📚', hint: 'درس‌هایی که خارج از برنامه خواندی' },
      { key: 'exams', label: 'آزمون‌های مشاور', icon: '📝', divider: true, hint: 'آزمون‌هایی که مشاورت تعیین کرده' },
      { key: 'school', label: 'امتحان‌ها و پرسش‌های مدرسه', icon: '🏫', hint: 'تاریخ امتحان‌هایت را ثبت کن' },
      { key: 'mock', label: 'کارنامه‌ی آزمون‌های آزمایشی', icon: '📈', hint: 'تراز و درصد آزمون‌های آزمایشی بیرونی' },
      { key: 'invite', label: 'دعوت دوستان و تخفیف', icon: '🎁', divider: true, hint: 'لینک دعوت و تخفیف شهریه' },
      { key: 'parent', label: 'اتصال والدین', icon: '👨‍👩‍👧', hint: 'کد دعوت برای دیدن پیشرفتت توسط والد' },
    ],
    [notifications.updatedPlans, notifications.unreadReminders]
  );

  // تغییر وضعیت یک آیتم درسی
  async function toggleItem(planId, dayId, itemId, currentStatus) {
    // بدون اینترنت چیزی ثبت نمی‌شود؛ تیک زدنِ الکی هم نمی‌گذاریم تا وضعیت دروغین نشان داده نشود
    if (offlineInfo) {
      toast.warning('برای ثبت وضعیت باید به اینترنت وصل باشی');
      return;
    }
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id !== planId
          ? plan
          : {
              ...plan,
              days: plan.days.map((day) =>
                day.id !== dayId
                  ? day
                  : {
                      ...day,
                      items: day.items.map((item) =>
                        item.id !== itemId ? item : { ...item, status: nextStatus }
                      ),
                    }
              ),
            }
      )
    );
    try {
      const res = await updateItemStatus(itemId, nextStatus);
      // با تیک‌زدن، زمانِ بازه خودکار برای «تگ اول» ثبت (یا با برداشتن تیک پاک) می‌شود؛ همان را نشان بده
      if (res && Array.isArray(res.itemLogs)) {
        setPlans((prev) => prev.map((plan) => (plan.id !== planId ? plan : {
          ...plan,
          days: plan.days.map((day) => (day.id !== dayId ? day : {
            ...day,
            items: day.items.map((item) => (item.id !== itemId ? item : { ...item, itemLogs: res.itemLogs })),
          })),
        })));
      }
    } catch (err) {
      setError(err.message);
      // ثبت نشد؛ تیکِ نمایشی را برگردان تا وضعیت دروغین نماند
      setPlans((prev) => prev.map((plan) => (plan.id !== planId ? plan : {
        ...plan,
        days: plan.days.map((day) => (day.id !== dayId ? day : {
          ...day,
          items: day.items.map((item) => (item.id !== itemId ? item : { ...item, status: currentStatus })),
        })),
      })));
    }
  }

  // toggle آیتم از روی تقویم هفتگی
  function handleCalendarToggle(item) {
    for (const plan of plans) {
      for (const day of plan.days) {
        if (day.items.some((it) => it.id === item.id)) {
          toggleItem(plan.id, day.id, item.id, item.status);
          return;
        }
      }
    }
  }

  // حذف یک یادآور
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
          setNotifications((n) => ({ ...n, unreadReminders: Math.max(0, n.unreadReminders - 1) }));
          toast.success('یادآور حذف شد');
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // محاسبه‌ی آمار کلی — منبع واحد: لاگ‌های per-tag درون آیتم‌ها (PlanItemLog).
  // اگر هیچ لاگی ثبت نشده، fallback به actualMinutes آیتم‌ها، و در نهایت به ساعت برنامه‌ریزی‌شده‌ی آیتم‌های DONE.
  const stats = useMemo(() => {
    const allItems = plans.flatMap((p) => p.days).flatMap((d) => d.items);
    const done = allItems.filter((i) => i.status === 'DONE').length;

    // ۱) مجموع دقیقه‌ی واقعی ثبت‌شده روی آیتم‌ها (روش قدیمی، فقط DONE)
    const itemActualMinutes = allItems
      .filter((i) => i.status === 'DONE')
      .reduce((sum, item) => sum + (item.actualMinutes || 0), 0);

    // ۲) مجموع دقیقه‌ی ثبت‌شده در لاگ‌های per-tag درون آیتم‌ها (روش اصلی فعلی)
    const logMinutes = allItems.reduce(
      (sum, item) => sum + (item.itemLogs || []).reduce((s, l) => s + (l.minutes || 0), 0),
      0
    );

    // fallback: مجموع ساعت برنامه‌ریزی‌شده‌ی آیتم‌های DONE
    const plannedTotalMinutes = allItems
      .filter((i) => i.status === 'DONE')
      .reduce((sum, item) => {
        if (!item.startTime || !item.endTime) return sum;
        const [sh, sm] = item.startTime.split(':').map(Number);
        const [eh, em] = item.endTime.split(':').map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        return sum + (diff > 0 ? diff : 0);
      }, 0);

    // مطالعه‌ی آزاد (خارج از برنامه) هم جزو مجموع مطالعه است
    const entryMinutes = entries.reduce((s, e) => s + (e.minutes || 0), 0);
    const entryTests = entries.reduce((s, e) => s + (e.testsTaken || 0), 0);

    // اولویت: لاگ‌ها > actualMinutes آیتم‌ها > planned
    const totalMinutes =
      (logMinutes > 0 ? logMinutes : itemActualMinutes > 0 ? itemActualMinutes : plannedTotalMinutes) + entryMinutes;
    const hours = Math.floor(totalMinutes / 60);

    // مجموع تست‌ها از هر دو منبع: item.testsTaken + log.testsTaken
    const itemTests = allItems.reduce((sum, item) => sum + (item.testsTaken || 0), 0);
    const logTests = allItems.reduce(
      (sum, item) => sum + (item.itemLogs || []).reduce((s, l) => s + (l.testsTaken || 0), 0),
      0
    );
    const totalTests = itemTests + logTests + entryTests;

    return {
      activePlans: plans.length,
      doneToday: done,
      totalTasks: allItems.length,
      studyHours: hours,
      totalMinutes,
      totalTests,
      logCount: allItems.reduce((s, i) => s + (i.itemLogs || []).length, 0),
    };
  }, [plans, entries]);

  // محاسبه‌ی پیشرفت نسبت به هدف هفتگی
  // پیشرفت کل آیتم‌های برنامه + نزدیک‌ترین آزمون آینده (برای کارت‌های بالای داشبورد)
  const planTotals = useMemo(() => {
    let done = 0;
    let total = 0;
    plans.forEach((p) => p.days?.forEach((d) => d.items?.forEach((i) => {
      total += 1;
      if (i.status === 'DONE') done += 1;
    })));
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [plans]);
   
  const nextExam = useMemo(() => {
    const now = Date.now();
    return exams
      .filter((e) => e.scheduledAt && new Date(e.scheduledAt).getTime() > now)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;
  }, [exams]);

  const goalProgress = useMemo(() => {
    if (!weeklyGoal || weeklyGoal === 0) return null;
    return Math.min(100, Math.round((stats.totalMinutes / weeklyGoal) * 100));
  }, [weeklyGoal, stats.totalMinutes]);

  return (
    <div className="student-app">
      <AppHeader
        fullName={auth.user.fullName}
        greeting={`سلام، ${auth.user.fullName}!`}
        menuItems={menuItems}
        activeMenu={section}
        onMenuSelect={(key) => setSection(key)}
        menuTitle="پنل دانش‌آموز"
        onOpenProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* ثبت‌نام مینیمال (شماره+رمز): تا رشته و مشخصات ضروری پر نشود، مودال باز می‌ماند */}
      {auth.user.registrationComplete === false && auth.user.role === 'STUDENT' && (
        <RegistrationCompleteModal role="STUDENT" />
      )}

      <main className="page-body student-body">
        {offlineInfo && (
          <div className="offline-banner" role="status">
            <span className="offline-banner-text">
              <Ico e="⚠" /> بدون اینترنت — آخرین برنامه‌ی ذخیره‌شده را می‌بینی
              {offlineInfo.savedAt ? ` (${formatRelativeTime(offlineInfo.savedAt)})` : ''}.
              ثبت وضعیت و زمان مطالعه نیاز به اینترنت دارد.
            </span>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
              تلاش دوباره
            </button>
          </div>
        )}
        {error && (
          <div className="alert alert-error" onClick={() => setError('')}>
            <span><Ico e="⚠" /></span> {error}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>یک لحظه، دارم برنامه‌ات رو میارم…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* بنر وضعیت اتصال به مشاور */}
            {advisor && advisor.linkStatus && advisor.linkStatus !== 'ACTIVE' && (
              <div className={`request-status-banner ${advisor.linkStatus.toLowerCase()}`}>
                <span className="request-status-emoji" aria-hidden>
                  <Ico e={advisor.linkStatus === 'PENDING' ? '⏳' : '🚫'} />
                </span>
                <div className="request-status-body">
                  <p className="request-status-title">
                    {advisor.linkStatus === 'PENDING'
                      ? `درخواست اتصال به «${advisor.fullName}» در انتظار تأیید است`
                      : `درخواست اتصال به «${advisor.fullName}» رد شد`}
                  </p>
                  <p className="request-status-desc">
                    {advisor.linkStatus === 'PENDING'
                      ? 'مشاور باید درخواست تو را تأیید کند تا به برنامه‌ی هفتگی و آزمون‌ها دسترسی پیدا کنی. این کار معمولاً چند ساعت تا یک روز طول می‌کشد.'
                      : 'می‌توانی با مراجعه به صفحه‌ی ثبت‌نام، مشاور دیگری انتخاب کنی. در صورت مشکل با پشتیبانی تماس بگیر.'}
                  </p>
                </div>
              </div>
            )}

            {section === 'home' && (
              <div id="section-home" className="page-section">
                <SectionGuide
                  userId={auth.user.id}
                  guideKey="student-home"
                  icon="🏠"
                  title="مرور اجمالی — خلاصه‌ی وضعیتت"
                  items={[
                    'کارت‌های بالا آمار مطالعه و پیشرفت هدف هفتگی‌ات را نشان می‌دهند و زیرشان یادآورهای مشاورت است.',
                    'برای رفتن به برنامه‌ها، یادآورها، آزمون‌ها و بقیه‌ی بخش‌ها، دکمه‌ی منو (سه‌خط) بالای صفحه را بزن.',
                  ]}
                />

              {/* بنر جمله‌ی روز استاد — مطابق کانسپت پنل دانش‌آموز */}
              {quote && (
                <div className="daily-quote-banner">
                  <span className="dqb-icon" aria-hidden><i className="ti ti-quote" /></span>
                  <p>{quote}</p>
                </div>
              )}

              <div data-tour="home-stats">
                <StudentStatsSection stats={stats} weeklyGoal={weeklyGoal} goalProgress={goalProgress} advisor={advisor} planTotals={planTotals} nextExam={nextExam} />
              </div>

              {/* یادآورهای مشاور — داخل «مرور اجمالی» */}
              <div id="section-reminders" data-tour="home-reminders">
                <RemindersSection
                  reminders={reminders}
                  unreadReminders={notifications.unreadReminders}
                  onDelete={handleDeleteReminder}
                />
              </div>

              </div>
            )}

            {section === 'invite' && (
              <div id="section-invite" className="page-section">
                <FriendInviteCard />
              </div>
            )}

            {section === 'school' && (
              <div id="section-school" className="page-section">
                {/* فهرست امتحان‌ها و پرسش‌های مدرسه — مشاورت هم آن را می‌بیند */}
                <div data-tour="school-card">
                  <ExamScheduleCard studentId={auth.user.id} canEdit />
                </div>
              </div>
            )}

            {section === 'mock' && (
              <div id="section-mock" className="page-section">
                {/* نمرات آزمون‌های آزمایشی + نمودار روند پیشرفت */}
                <div data-tour="mock-card">
                  <MockExamsCard studentId={auth.user.id} canEdit />
                </div>
              </div>
            )}

            {section === 'parent' && (
              <div id="section-parent" className="page-section">
                <div data-tour="parent-card">
                  <ParentInviteCard />
                </div>
              </div>
            )}

            {section === 'plans' && (
            <section id="section-plans" className="plans-section">
              <SectionGuide
                userId={auth.user.id}
                guideKey="student-plans"
                icon="🗓"
                title="برنامه‌ها — کار روزانه‌ات"
                items={[
                  'هر درس را که انجام دادی تیک بزن.',
                  'دقیقه‌ی مطالعه و تعداد تست را برای هر درس ثبت کن تا آمار و گزارش دقیق شود.',
                  'با تب «تقویم» برنامه را روی هفته ببین و با تب «آمار» روندت را بررسی کن.',
                ]}
                tone="sage"
              />
              <div className="section-head with-tabs" data-tour="plans-tabs">
                <h3 className="section-title">
                  <span className="section-emoji"><Ico e="🗓" /></span>
                  برنامه‌های مطالعاتی
                </h3>
                {notifications.updatedPlans > 0 && (
                  <span className="badge-updated">{toFaDigits(notifications.updatedPlans)} به‌روزرسانی جدید</span>
                )}
                <div className="view-tabs">
                  {[
                    { key: 'list', icon: '📋', label: 'لیست' },
                    { key: 'calendar', icon: '📅', label: 'تقویم' },
                    { key: 'reports', icon: '📊', label: 'آمار' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      className={`tab-btn-sm ${view === tab.key ? 'active' : ''}`}
                      onClick={() => setView(tab.key)}
                    >
                      <Ico e={tab.icon} /> {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* گزینه‌ی هدایت سریع به مطالعه‌ی آزاد */}
              <div className="free-study-cta-card">
                <div className="free-study-cta-content">
                  <div className="free-study-cta-icon" aria-hidden="true">
                    <Ico e="📚" />
                  </div>
                  <div className="free-study-cta-text">
                    <strong>مطالعه‌ی خارج از برنامه داشتی؟</strong>
                    <p>هر درسی را که جدا از برنامه‌ی مشاور خواندی، در بخش مطالعه‌ی آزاد ثبت کن تا به ساعت مطالعه و تست‌های هفتگی‌ات اضافه شود.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary free-study-cta-btn"
                  onClick={() => setSection('free')}
                >
                  <span>ورود به مطالعه‌ی آزاد</span>
                  <i className="ti ti-arrow-left" aria-hidden="true" />
                </button>
              </div>

              {plans.length === 0 ? (
                <div className="empty-card">
                  <span className="empty-emoji" aria-hidden><Ico e="📭" /></span>
                  <p>هنوز برنامه‌ای برایت ثبت نشده. مشاورت به‌زودی برنامه‌ات رو می‌سازه.</p>
                </div>
              ) : view === 'list' ? (
                <div className="plans-list">
                  {plans.map((plan) => {
                    const isOpen = openPlanId === plan.id;
                    return (
                      <PlanStudentCard
                        key={plan.id}
                        plan={plan}
                        isOpen={isOpen}
                        onToggleOpen={() => setOpenPlanId(isOpen ? null : plan.id)}
                        onToggleItem={toggleItem}
                        studentName={auth?.user?.fullName}
                        advisorName={advisor?.fullName}
                        isUpdated={!!plansBaseline && !!plan.updatedAt && new Date(plan.updatedAt) > new Date(plansBaseline)}
                        progressRows={progressRows}
                        onProgressChange={setProgressRows}
                      />
                    );
                  })}
                </div>
              ) : view === 'calendar' ? (
                <div className="calendar-wrap">
                  <p className="calendar-hint"><Ico e="💡" /> برای تیک زدن یک درس، روی بلوک آن کلیک کن.</p>
                  <WeeklyCalendarView plans={plans} onToggleItem={handleCalendarToggle} />
                </div>
              ) : (
                <Reports plans={plans} weeklyGoalMinutes={weeklyGoal} variant="student" entries={entries} />
              )}
            </section>
            )}

            {section === 'free' && (
              <div id="section-free" className="page-section">
                <SectionGuide
                  userId={auth.user.id}
                  guideKey="student-free"
                  icon="📚"
                  title="مطالعه‌ی آزاد — درس‌های خارج از برنامه"
                  items={[
                    'هر درسی که جدا از برنامه‌ی پیشنهادی مشاورت خواندی را اینجا ثبت کن تا در ساعات کل مطالعه و آمار هفتگی بیاید.',
                    'می‌توانی زمان را به دو روش وارد کنی: با بازه زمانی (ساعت شروع و پایان) یا مجموع دقایق مطالعه.',
                    'با انتخاب تگ (تمرین، مرور، پیشروی یا کارهای مدرسه) و ثبت تست، گزارش‌هایت دقیق‌تر رسم می‌شوند.',
                  ]}
                  tone="indigo"
                />
                <FreeStudyCard
                  canEdit
                  entries={entries}
                  onEntriesChange={setEntries}
                  subjectSuggestions={plans.flatMap((p) => p.days).flatMap((d) => d.items).map((i) => i.subject)}
                />
              </div>
            )}

            {section === 'exams' && (
              <section id="section-exams" className="exams-section">
                <SectionGuide
                  userId={auth.user.id}
                  guideKey="student-exams"
                  icon="📝"
                  title="آزمون‌ها — آزمون‌های تعیین‌شده‌ی مشاور"
                  items={[
                    'آزمون در زمان تعیین‌شده باز می‌شود؛ پاسخ‌ها را همین‌جا بنویس.',
                    'بعد از تصحیح مشاور، نمره و مرور پاسخ‌های درست را می‌بینی.',
                  ]}
                  tone="amber"
                />
                <div className="section-head">
                  <h3 className="section-title">
                    <span className="section-emoji"><Ico e="📝" /></span>
                    آزمون‌های من
                  </h3>
                </div>
                {exams.length === 0 ? (
                  <div className="empty-card">
                    <span className="empty-emoji" aria-hidden><Ico e="📭" /></span>
                    <p>هنوز آزمونی از طرف مشاورت برایت تعیین نشده.</p>
                  </div>
                ) : (
                  <div className="exam-list">
                    {exams.map((exam) => (
                      <ExamStudentCard key={exam.id} exam={exam} onStart={setActiveExam} onReview={setReviewExam} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* مودال شرکت در آزمون */}
            {activeExam && (
              <ExamTaker
                exam={activeExam}
                onReview={(examId) => {
                  setActiveExam(null);
                  setReviewExam({ id: examId });
                }}
                onClose={() => {
                  setActiveExam(null);
                  // بارگذاری مجدد آزمون‌ها برای به‌روزرسانی وضعیت
                  fetchMyExams()
                    .then((data) => setExams(data.exams || []))
                    .catch(() => {});
                }}
              />
            )}
          </>
        )}
      </main>

      {/* نوار ناوبری ارگونومیک پایین صفحه برای موبایل */}
      <nav className="student-bottom-bar" aria-label="ناوبری سریع موبایل">
        <button
          type="button"
          className={`bottom-bar-item ${section === 'home' ? 'active' : ''}`}
          onClick={() => setSection('home')}
        >
          <i className="ti ti-smart-home" aria-hidden="true" />
          <span>امروز</span>
        </button>
        <button
          type="button"
          className={`bottom-bar-item ${section === 'plans' ? 'active' : ''}`}
          onClick={() => setSection('plans')}
        >
          <i className="ti ti-calendar" aria-hidden="true" />
          <span>برنامه</span>
        </button>
        <button
          type="button"
          className={`bottom-bar-item ${section === 'free' ? 'active' : ''}`}
          onClick={() => setSection('free')}
        >
          <i className="ti ti-book-2" aria-hidden="true" />
          <span>مطالعه آزاد</span>
        </button>
        <button
          type="button"
          className={`bottom-bar-item ${section === 'exams' ? 'active' : ''}`}
          onClick={() => setSection('exams')}
        >
          <i className="ti ti-clipboard-check" aria-hidden="true" />
          <span>آزمون‌ها</span>
        </button>
      </nav>

      {/* مودال مرور پاسخ‌های آزمون ارسال‌شده */}
      {reviewExam && (
        <ExamReview examId={reviewExam.id} onClose={() => setReviewExam(null)} />
      )}

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

    </div>
  );
}