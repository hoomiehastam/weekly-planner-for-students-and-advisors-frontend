import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyChildren, fetchChildSummary, joinAsParent } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { toFaDigits, formatJalaliDate, formatJalaliShort } from '../utils/jalali';
import AppHeader from '../components/AppHeader';
import StatCard from '../components/StatCard';
import MockExamsCard from '../components/MockExamsCard';
import ProfileModal from '../components/ProfileModal';
import Ico from '../components/Ico';
import usePanelSection from '../hooks/usePanelSection';

// پنل والد — فقط-خواندنی: آمار تجمیعی فرزند، نمرات آزمون، وضعیت اشتراک و پرداخت.
// والد به یادآورهای مشاور و توضیحات خصوصی دسترسی ندارد (حریم دانش‌آموز).
export default function ParentDashboard() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  // بخش‌های پنل — هر کدام یک صفحه‌ی جدا از منوی همبرگری
  const [section, setSection] = usePanelSection(['summary', 'exams', 'subscription', 'connect'], 'summary');
  const menuItems = useMemo(() => [
    { key: 'summary', label: 'وضعیت فرزند', icon: '📈' },
    { key: 'exams', label: 'آزمون‌ها و نمرات', icon: '📝' },
    { key: 'subscription', label: 'اشتراک و پرداخت', icon: '💳' },
    { key: 'connect', label: children.length === 0 ? 'اتصال به فرزند' : 'افزودن فرزند دیگر', icon: '🔗', divider: true },
  ], [children.length]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    fetchMyChildren()
      .then((data) => {
        setChildren(data.children || []);
        if (data.children?.length > 0) setSelectedChildId(data.children[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    // نمایش فوری حالت لودینگ قبل از fetch — الگوی رایج پروژه (DepositPage)
     
    setLoadingSummary(true);
    fetchChildSummary(selectedChildId)
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSummary(false));
  }, [selectedChildId]);

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setError('');
    try {
      const data = await joinAsParent(joinCode.trim().toUpperCase());
      toast.success(data.message || 'اتصال انجام شد');
      setJoinCode('');
      const res = await fetchMyChildren();
      setChildren(res.children || []);
      if (res.children?.length > 0) setSelectedChildId(res.children[0].id);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  // درصد انجام آیتم‌ها
  const donePercent = summary && summary.stats.totalItems > 0
    ? Math.round((summary.stats.doneItems / summary.stats.totalItems) * 100)
    : 0;

  // درصد پیشرفت نسبت به هدف هفتگی
  const goalPercent = summary?.weeklyGoalMinutes
    ? Math.min(100, Math.round((summary.stats.totalMinutes / summary.weeklyGoalMinutes) * 100))
    : null;

  const sub = summary?.subscription;
  // مقایسه‌ی زنده‌ی تاریخ با «الان» عمداً در رندر انجام می‌شود (الگوی DepositPage.SubscriptionChip)
   
  const subActive = sub && sub.status !== 'EXPIRED' && new Date(sub.endsAt).getTime() > Date.now();

  return (
    <div className="parent-app">
      <AppHeader
        fullName={auth.user.fullName}
        greeting={`سلام، ${auth.user.fullName}`}
        menuItems={menuItems}
        activeMenu={section}
        onMenuSelect={(key) => setSection(key)}
        menuTitle="پنل والد"
        onOpenProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <main className="page-body parent-body">
        {error && (
          <div className="alert alert-error" onClick={() => setError('')}>
            <span><Ico e="⚠" /></span> {error}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>در حال بارگذاری…</p>
          </div>
        )}

        {/* اتصال با کد دعوت — تا وقتی هیچ فرزندی وصل نیست برجسته نمایش داده می‌شود */}
        {!loading && (section === 'connect' || children.length === 0) && (
          <section className={`card parent-join-card ${children.length === 0 ? 'highlight' : ''}`}>
            <h3 className="card-title">
              <span aria-hidden><Ico e="🔗" /></span> {children.length === 0 ? 'اتصال به فرزند' : 'افزودن فرزند دیگر'}
            </h3>
            <p className="muted-text">
              کد ۸ حرفی دعوت را که فرزندت از پنل خودش ساخته، همین‌جا وارد کن.
            </p>
            <form onSubmit={handleJoin} className="parent-join-form">
              <input
                dir="ltr"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="مثل AB12CD34"
                maxLength={8}
                className="parent-join-input"
              />
              <button type="submit" className="btn-primary" disabled={joining || joinCode.length !== 8}>
                {joining ? 'در حال اتصال…' : 'اتصال'}
              </button>
            </form>
          </section>
        )}

        {!loading && children.length > 0 && (
          <>
            {/* انتخاب فرزند */}
            {children.length > 1 && (
              <div className="tab-row" role="tablist" aria-label="انتخاب فرزند">
                {children.map((c) => (
                  <button
                    key={c.id}
                    className={`tab-btn ${selectedChildId === c.id ? 'active' : ''}`}
                    onClick={() => setSelectedChildId(c.id)}
                  >
                    {c.fullName}
                  </button>
                ))}
              </div>
            )}

            {loadingSummary && (
              <div className="loading-state">
                <div className="spinner" />
                <p>در حال بارگذاری…</p>
              </div>
            )}

            {summary && !loadingSummary && (
              <>
                <div className="child-head">
                  <div className="child-avatar" aria-hidden>{(summary.student?.fullName || '؟').trim().charAt(0)}</div>
                  <div className="child-info">
                    <p className="child-name">{summary.student?.fullName}</p>
                    <p className="muted-text">
                      {summary.advisor
                        ? `مشاور: ${summary.advisor.fullName}`
                        : 'هنوز به مشاوری متصل نشده است.'}
                    </p>
                  </div>
                  <div className="child-ring" style={{ '--p': `${donePercent}%` }} title="درصد انجام برنامه">
                    <span>{toFaDigits(donePercent)}٪</span>
                  </div>
                </div>

                {section === 'summary' && (<>
                {/* آمار تجمیعی */}
                <section className="stats-grid">
                  <StatCard
                    icon="✓"
                    label="درس‌های انجام‌شده"
                    value={`${toFaDigits(summary.stats.doneItems)} از ${toFaDigits(summary.stats.totalItems)}`}
                    accent="sage"
                  />
                  <StatCard
                    icon="⏱"
                    label="ساعت مطالعه"
                    value={toFaDigits(Math.floor(summary.stats.totalMinutes / 60))}
                    accent="amber"
                  />
                  <StatCard
                    icon="✎"
                    label="تست‌های زده‌شده"
                    value={toFaDigits(summary.stats.totalTests)}
                    accent="pink"
                  />
                  <StatCard
                    icon="🗓"
                    label="برنامه‌های فعال"
                    value={toFaDigits(summary.stats.activePlans)}
                    accent="indigo"
                  />
                </section>

                {/* پیشرفت */}
                <section className="card">
                  <h3 className="card-title">
                    <span aria-hidden><Ico e="📈" /></span> پیشرفت
                  </h3>
                  <div className="progress-block">
                    <div className="progress-labels">
                      <span className="muted-text">درصد انجام برنامه</span>
                      <span className="muted-text">{toFaDigits(donePercent)}٪</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${donePercent}%` }} />
                    </div>
                  </div>
                  {goalPercent != null && (
                    <div className="progress-block">
                      <div className="progress-labels">
                        <span className="muted-text">
                          هدف هفتگی ({toFaDigits(Math.round(summary.weeklyGoalMinutes / 60))} ساعت)
                        </span>
                        <span className="muted-text">{toFaDigits(goalPercent)}٪</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${goalPercent}%` }} />
                      </div>
                    </div>
                  )}
                </section>

                </>)}

                {section === 'exams' && (<>
                {/* نمرات آزمون‌های آزمایشی فرزند + نمودار روند پیشرفت */}
                {selectedChildId && <MockExamsCard studentId={selectedChildId} compact />}

                {/* آزمون‌ها */}
                <section className="card">
                  <h3 className="card-title">
                    <span aria-hidden><Ico e="📝" /></span> آزمون‌های اخیر
                  </h3>
                  {summary.exams.length === 0 ? (
                    <p className="muted-text">هنوز آزمونی ثبت نشده.</p>
                  ) : (
                    <div className="parent-exam-list">
                      {summary.exams.map((exam) => (
                        <div key={exam.id} className="parent-exam-row">
                          <div>
                            <strong>{exam.title}</strong>
                            <small>{formatJalaliShort(exam.scheduledAt)}</small>
                          </div>
                          {exam.submission ? (
                            exam.submission.status === 'GRADED' ? (
                              <span className="status-pill done">
                                نمره: {toFaDigits(exam.submission.totalScore)} از {toFaDigits(exam.submission.maxScore)}
                              </span>
                            ) : exam.submission.status === 'SUBMITTED' ? (
                              <span className="status-pill pending">در انتظار تصحیح</span>
                            ) : (
                              <span className="status-pill pending">در حال آزمون</span>
                            )
                          ) : (
                            <span className="status-pill pending">هنوز شروع نشده</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                </>)}

                {/* اشتراک و پرداخت — والد پرداخت‌کننده است */}
                {section === 'subscription' && (
                <section className="card parent-subscription-card">
                  <h3 className="card-title">
                    <span aria-hidden><Ico e="💳" /></span> اشتراک و پرداخت
                  </h3>
                  {sub ? (
                    <p className={subActive ? 'goal-current' : 'sub-expired-text'}>
                      {subActive
                        ? `اشتراک فعال است تا ${formatJalaliDate(sub.endsAt, { withYear: false })}`
                        : `اشتراک منقضی شده (${formatJalaliDate(sub.endsAt, { withYear: false })})`}
                    </p>
                  ) : (
                    <p className="muted-text">وضعیت اشتراکی ثبت نشده.</p>
                  )}
                  <p className="muted-text">
                    برای تمدید اشتراک فرزندتان، مبلغ را به کارت معرفی‌شده واریز کنید و عکس رسید را ثبت کنید؛
                    تأیید با مشاور یا مؤسسه است.
                  </p>
                  <button type="button" className="btn-primary" onClick={() => navigate('/deposit')}>
                    <Ico e="💳" /> واریز و تمدید اشتراک فرزند
                  </button>
                </section>
                )}
              </>
            )}
          </>
        )}

        {!loading && children.length === 0 && (
          <div className="empty-card">
            <span className="empty-emoji" aria-hidden><i className="ti ti-users-group" /></span>
            <p>هنوز به هیچ دانش‌آموزی متصل نشده‌اید. با کد دعوت فرزندتان وصل شوید.</p>
          </div>
        )}
      </main>
    </div>
  );
}
