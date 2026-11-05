import { useEffect, useMemo, useState } from 'react';
import { fetchStudentExamEvents, fetchMockExamScores } from '../../api/client';
import { toFaDigits, formatJalaliShort } from '../../utils/jalali';
import StatCard from '../StatCard';

// دقیقه‌ی مطالعه‌ی ثبت‌شده — همان منطق پنل دانش‌آموز (لاگ‌ها > actualMinutes > زمان برنامه‌ریزی‌شده‌ی انجام‌شده‌ها)
function studyMinutes(plans, entries = []) {
  const free = entries.reduce((n, e) => n + (e.minutes || 0), 0);
  const items = plans.flatMap((p) => p.days).flatMap((d) => d.items);
  const logs = items.reduce((n, it) => n + (it.itemLogs || []).reduce((s, l) => s + (l.minutes || 0), 0), 0);
  if (logs > 0) return logs + free;
  const actual = items.filter((i) => i.status === 'DONE').reduce((n, it) => n + (it.actualMinutes || 0), 0);
  if (actual > 0) return actual + free;
  return free + items.filter((i) => i.status === 'DONE').reduce((n, it) => {
    if (!it.startTime || !it.endTime) return n;
    const [sh, sm] = it.startTime.split(':').map(Number);
    const [eh, em] = it.endTime.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    return n + (diff > 0 ? diff : 0);
  }, 0);
}

function daysUntil(iso) {
  const t = new Date(iso); t.setHours(0, 0, 0, 0);
  const n = new Date(); n.setHours(0, 0, 0, 0);
  return Math.round((t - n) / 86400000);
}

// «مرور اجمالی» بالای پنل مشاور: چهار کارت خلاصه‌ی وضعیت دانش‌آموز انتخاب‌شده.
// plans فقط برنامه‌های منتشرشده است (پیش‌نویس‌ها در آمار نمی‌آیند).
export default function StudentOverviewSummary({ student, plans, entries = [] }) {
  const [events, setEvents] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchStudentExamEvents(student.id).then((d) => { if (!cancelled) setEvents(d.events || []); }).catch(() => {});
    fetchMockExamScores(student.id).then((d) => { if (!cancelled) setScores(d.scores || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [student.id]);

  const progress = useMemo(() => {
    const all = plans.flatMap((p) => p.days).flatMap((d) => d.items);
    if (all.length === 0) return null;
    return Math.round((all.filter((i) => i.status === 'DONE').length / all.length) * 100);
  }, [plans]);
  const minutes = useMemo(() => studyMinutes(plans, entries), [plans, entries]);
  const goal = student.weeklyGoalMinutes || 0;
  const nextExam = useMemo(
    () => events.filter((e) => daysUntil(e.dueAt) >= 0).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0] || null,
    [events]
  );
  const lastScore = useMemo(
    () => [...scores].sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt))[0] || null,
    [scores]
  );

  const examLabel = nextExam
    ? (() => {
        const d = daysUntil(nextExam.dueAt);
        return d === 0 ? 'امروز' : d === 1 ? 'فردا' : `${toFaDigits(d)} روز دیگر`;
      })()
    : '—';

  return (
    <section className="stats-grid overview-grid" aria-label="خلاصه‌ی وضعیت دانش‌آموز" data-tour="ov-summary">
      <StatCard icon="✅" label="انجام برنامه" value={progress == null ? '—' : `${toFaDigits(progress)}٪`} accent="sage" />
      <StatCard
        icon="⏱"
        label={goal ? 'مطالعه نسبت به هدف' : 'ساعت مطالعه ثبت‌شده'}
        value={goal
          ? `${toFaDigits(Math.floor(minutes / 60))} از ${toFaDigits(Math.round(goal / 60))} ساعت`
          : `${toFaDigits(Math.floor(minutes / 60))} ساعت`}
        accent="indigo"
      />
      <StatCard
        icon="🏫"
        label={nextExam ? `امتحان بعدی: ${nextExam.title}` : 'امتحان بعدی'}
        value={examLabel}
        accent="amber"
      />
      <StatCard
        icon="📈"
        label={lastScore ? `آخرین آزمایشی (${formatJalaliShort(lastScore.takenAt)})` : 'آخرین آزمایشی'}
        value={lastScore && lastScore.rank != null ? `تراز ${toFaDigits(lastScore.rank)}` : lastScore ? lastScore.title : '—'}
        accent="pink"
      />
    </section>
  );
}
