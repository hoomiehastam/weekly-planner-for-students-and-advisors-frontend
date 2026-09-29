import { useEffect, useMemo, useState } from 'react';
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
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { toFaDigits } from '../utils/jalali';
import AppHeader from '../components/AppHeader';
import StudentStatsSection from '../components/student/StudentStatsSection';
import RemindersSection from '../components/student/RemindersSection';
import ParentInviteCard from '../components/student/ParentInviteCard';
import PlanStudentCard from '../components/student/PlanStudentCard';
import ExamStudentCard from '../components/student/ExamStudentCard';
import WeeklyCalendarView from '../components/WeeklyCalendarView';
import Reports from '../components/Reports';
import ProfileModal from '../components/ProfileModal';
import ExamTaker from '../components/ExamTaker';
import ExamReview from '../components/student/ExamReview';
import ConfirmModal from '../components/ConfirmModal';
import MobileNav from '../components/MobileNav';

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
  const toast = useToast();

  // آیتم‌های نوار پایین موبایل — فقط اسکرول به بخش‌های صفحه
  const navItems = useMemo(
    () => [
      { key: 'home', label: 'خانه', icon: '🏠', target: 'section-home' },
      { key: 'plans', label: 'برنامه‌ها', icon: '🗓', target: 'section-plans' },
      { key: 'exams', label: 'آزمون‌ها', icon: '📝', target: 'section-exams' },
    ],
    []
  );

  function handleNavSelect(_key, item) {
    const id = item?.target || _key;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    async function load() {
      try {
        const [plansData, remindersData, summary, goalData, advisorData, examsData] = await Promise.all([
          fetchMyPlans(),
          fetchMyReminders(),
          fetchNotificationSummary(),
          fetchMyWeeklyGoal().catch(() => ({ weeklyGoalMinutes: null, linkStatus: null })),
          fetchMyAdvisor().catch(() => ({ advisor: null, linkStatus: null })),
          fetchMyExams().catch(() => ({ exams: [] })),
        ]);
        setPlans(plansData.plans);
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

        // پس از نمایش، اعلان‌ها «خوانده‌شده» علامت می‌خورند و بدج به‌صورت موضعی هم صفر می‌شود
        Promise.allSettled([markNotificationSeen('reminders'), markNotificationSeen('plans')]).then(
          ([remindersResult, plansResult]) => {
            setNotifications((n) => ({
              unreadReminders: remindersResult.status === 'fulfilled' ? 0 : n.unreadReminders,
              updatedPlans: plansResult.status === 'fulfilled' ? 0 : n.updatedPlans,
            }));
          }
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auth?.user?.id]);

  // تغییر وضعیت یک آیتم درسی
  async function toggleItem(planId, dayId, itemId, currentStatus) {
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
      await updateItemStatus(itemId, nextStatus);
    } catch (err) {
      setError(err.message);
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
      confirmText: '🗑 حذف',
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

    // اولویت: لاگ‌ها > actualMinutes آیتم‌ها > planned
    const totalMinutes =
      logMinutes > 0 ? logMinutes : itemActualMinutes > 0 ? itemActualMinutes : plannedTotalMinutes;
    const hours = Math.floor(totalMinutes / 60);

    // مجموع تست‌ها از هر دو منبع: item.testsTaken + log.testsTaken
    const itemTests = allItems.reduce((sum, item) => sum + (item.testsTaken || 0), 0);
    const logTests = allItems.reduce(
      (sum, item) => sum + (item.itemLogs || []).reduce((s, l) => s + (l.testsTaken || 0), 0),
      0
    );
    const totalTests = itemTests + logTests;

    return {
      activePlans: plans.length,
      doneToday: done,
      totalTasks: allItems.length,
      studyHours: hours,
      totalMinutes,
      totalTests,
      logCount: allItems.reduce((s, i) => s + (i.itemLogs || []).length, 0),
    };
  }, [plans]);

  // محاسبه‌ی پیشرفت نسبت به هدف هفتگی
  const goalProgress = useMemo(() => {
    if (!weeklyGoal || weeklyGoal === 0) return null;
    return Math.min(100, Math.round((stats.totalMinutes / weeklyGoal) * 100));
  }, [weeklyGoal, stats.totalMinutes]);

  return (
    <div className="student-app">
      <AppHeader
        fullName={auth.user.fullName}
        greeting={`سلام، ${auth.user.fullName}!`}
        onOpenProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <main className="page-body student-body">
        {error && (
          <div className="alert alert-error" onClick={() => setError('')}>
            <span>⚠</span> {error}
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
                  {advisor.linkStatus === 'PENDING' ? '⏳' : '🚫'}
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

            <div id="section-home" className="page-section">
              {/* بنر جمله‌ی روز استاد — مطابق کانسپت پنل دانش‌آموز */}
              {quote && (
                <div className="daily-quote-banner">
                  <span className="dqb-icon" aria-hidden>❝</span>
                  <p>{quote}</p>
                </div>
              )}

              <StudentStatsSection stats={stats} weeklyGoal={weeklyGoal} goalProgress={goalProgress} advisor={advisor} />

              <RemindersSection
                reminders={reminders}
                unreadReminders={notifications.unreadReminders}
                onDelete={handleDeleteReminder}
              />

              <ParentInviteCard />
            </div>

            {/* برنامه‌های مطالعاتی با تب‌بندی list/calendar/reports */}
            <section id="section-plans" className="plans-section">
              <div className="section-head with-tabs">
                <h3 className="section-title">
                  <span className="section-emoji">🗓</span>
                  برنامه‌های مطالعاتی
                </h3>
                {notifications.updatedPlans > 0 && (
                  <span className="badge-updated">{toFaDigits(notifications.updatedPlans)} به‌روزرسانی جدید</span>
                )}
                <div className="view-tabs">
                  {[
                    { key: 'list', label: '📋 لیست' },
                    { key: 'calendar', label: '📅 تقویم' },
                    { key: 'reports', label: '📊 آمار' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      className={`tab-btn-sm ${view === tab.key ? 'active' : ''}`}
                      onClick={() => setView(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {plans.length === 0 ? (
                <div className="empty-card">
                  <span className="empty-emoji" aria-hidden>📭</span>
                  <p>هنوز برنامه‌ای برایت ثبت نشده. مشاورت به‌زودی برنامه‌ات رو می‌سازه.</p>
                </div>
              ) : view === 'list' ? (
                <div className="plans-list">
                  {plans.map((plan) => {
                    const isOpen = openPlanId === plan.id || plans.length === 1;
                    return (
                      <PlanStudentCard
                        key={plan.id}
                        plan={plan}
                        isOpen={isOpen}
                        onToggleOpen={() => setOpenPlanId(isOpen ? null : plan.id)}
                        onToggleItem={toggleItem}
                        studentName={auth?.user?.fullName}
                      />
                    );
                  })}
                </div>
              ) : view === 'calendar' ? (
                <div className="calendar-wrap">
                  <p className="calendar-hint">💡 برای تیک زدن یک درس، روی بلوک آن کلیک کن.</p>
                  <WeeklyCalendarView plans={plans} onToggleItem={handleCalendarToggle} />
                </div>
              ) : (
                <Reports plans={plans} weeklyGoalMinutes={weeklyGoal} variant="student" />
              )}
            </section>

            {/* بخش آزمون‌ها */}
            {exams.length > 0 && (
              <section id="section-exams" className="exams-section">
                <div className="section-head">
                  <h3 className="section-title">
                    <span className="section-emoji">📝</span>
                    آزمون‌های من
                  </h3>
                </div>
                <div className="exam-list">
                  {exams.map((exam) => (
                    <ExamStudentCard key={exam.id} exam={exam} onStart={setActiveExam} onReview={setReviewExam} />
                  ))}
                </div>
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

      <MobileNav items={navItems} onSelect={handleNavSelect} />
    </div>
  );
}