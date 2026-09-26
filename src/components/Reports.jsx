import { useMemo, useState, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { DAY_NAMES } from '../utils/dayNames';
import { toFaDigits, formatJalaliDate, toJalali } from '../utils/jalali';
import Zoomable from './Zoomable';

// ابزار تاریخ برای ردیف زمانی روزانه
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateKey(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// نام روزهای هفته به فارسی — حرف اول هر روز (برای برچسب محور افقی نمودار)
const SHORT_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const TAG_COLORS = [
  '#4A3FBE', '#FF8A3D', '#2BB673', '#FF6B9D',
  '#14B8A6', '#3B82F6', '#9333EA', '#EC4899',
  '#F59E0B', '#06B6D4', '#84CC16', '#A855F7',
];

// محاسبه‌ی تعداد دقیقه‌ی برنامه‌ریزی‌شده از یک بازه‌ی زمانی
function getPlannedMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

// تبدیل دقیقه به ساعت و دقیقه برای نمایش
function formatMinutes(minutes) {
  if (!minutes || minutes === 0) return '۰ دقیقه';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${toFaDigits(m)} دقیقه`;
  if (m === 0) return `${toFaDigits(h)} ساعت`;
  return `${toFaDigits(h)} ساعت و ${toFaDigits(m)} دقیقه`;
}

// props:
//   plans: آرایه‌ی برنامه‌های فعال (هر آیتم شامل tags و itemLogs)
//   weeklyGoalMinutes: هدف هفتگی (به دقیقه)
//   variant: 'student' | 'advisor' (پیش‌فرض: 'advisor')
//     - در حالت student: بخش‌های «زمان هر درس» و «سایر کارها» به سبک دانش‌آموزی نمایش داده می‌شوند
//     - در حالت advisor: همان سبک قبلی (با جزئیات بیشتر برای مشاور)
export default function Reports({ plans, weeklyGoalMinutes, variant = 'advisor' }) {
  const stats = useMemo(() => {
    const byDay = DAY_NAMES.map((name) => ({
      name,
      plannedMinutes: 0,
      itemActualMinutes: 0,
      logMinutes: 0,
      done: 0,
      total: 0,
      tests: 0,
    }));
    const bySubject = new Map(); // آمار per-subject با جزئیات per-tag
    const byTag = new Map();     // آمار per-tag (فقط از لاگ‌ها)
    const otherEntries = [];      // لیست «سایر کارها» با توضیحات
    let totalPlannedMinutes = 0;
    let totalItemActualMinutes = 0;
    let totalLogMinutes = 0;
    let totalDone = 0;
    let totalItems = 0;
    let totalTests = 0;

    // ۱) پردازش آیتم‌ها برای byDay، bySubject و آمار کلی
    for (const plan of plans) {
      for (const day of plan.days || []) {
        for (const item of day.items || []) {
          totalItems++;

          const plannedMin = getPlannedMinutes(item.startTime, item.endTime);
          const itemActualMin = item.actualMinutes ?? 0;
          const logMin = (item.itemLogs || []).reduce((s, l) => s + (l.minutes || 0), 0);
          const itemTests = item.testsTaken || 0;
          const logTests = (item.itemLogs || []).reduce((s, l) => s + (l.testsTaken || 0), 0);
          const totalItemTests = itemTests + logTests;

          // زمان مؤثر این آیتم: لاگ‌ها > actualMinutes > planned (در صورت DONE)
          let effectiveMin = 0;
          if (logMin > 0) effectiveMin = logMin;
          else if (itemActualMin > 0) effectiveMin = itemActualMin;
          else if (item.status === 'DONE') effectiveMin = plannedMin;

          if (item.status === 'DONE') {
            totalDone++;
            totalPlannedMinutes += plannedMin;
            totalItemActualMinutes += itemActualMin;
            byDay[day.dayOfWeek].plannedMinutes += plannedMin;
            byDay[day.dayOfWeek].itemActualMinutes += itemActualMin;
            byDay[day.dayOfWeek].done++;
          }
          byDay[day.dayOfWeek].logMinutes += logMin;
          byDay[day.dayOfWeek].tests += totalItemTests;
          byDay[day.dayOfWeek].total++;

          totalLogMinutes += logMin;
          totalTests += totalItemTests;

          // آمار per-subject با جزئیات per-tag
          const subj = item.subject || 'بدون نام';
          if (!bySubject.has(subj)) {
            bySubject.set(subj, {
              name: subj,
              studyMinutes: 0,
              plannedMinutes: 0,
              count: 0,
              tests: 0,
              // برای هر تگ، زمان و تست ثبت‌شده در این درس
              byTag: new Map(),
              // مجموع زمان «سایر کارها» برای این درس
              otherMinutes: 0,
              otherTests: 0,
              otherNotes: [],
            });
          }
          const s = bySubject.get(subj);
          s.count++;
          s.studyMinutes += effectiveMin;
          if (item.status === 'DONE') s.plannedMinutes += plannedMin;
          s.tests += totalItemTests;

          // تفکیک لاگ‌های این آیتم به تگ‌هایش
          for (const log of item.itemLogs || []) {
            const logMin = log.minutes || 0;
            const logT = log.testsTaken || 0;
            const note = log.note || '';

            if (log.tagId) {
              // لاگ برای یک تگ مشخص
              const tagName = log.tag?.name || 'نامشخص';
              if (!s.byTag.has(tagName)) {
                s.byTag.set(tagName, { minutes: 0, tests: 0 });
              }
              const tg = s.byTag.get(tagName);
              tg.minutes += logMin;
              tg.tests += logT;

              // هم‌زمان به byTag کلی هم اضافه کن
              if (!byTag.has(tagName)) {
                byTag.set(tagName, { name: tagName, minutes: 0, tests: 0 });
              }
              const btg = byTag.get(tagName);
              btg.minutes += logMin;
              btg.tests += logT;
            } else {
              // لاگ «سایر کارها» (tagId = null)
              s.otherMinutes += logMin;
              s.otherTests += logT;
              if (note) {
                s.otherNotes.push({ note, minutes: logMin, tests: logT });
                // هم‌زمان به otherEntries کلی اضافه کن
                otherEntries.push({
                  subject: subj,
                  note,
                  minutes: logMin,
                  tests: logT,
                });
              }
            }
          }
        }
      }
    }

    // زمان مؤثر کل — منطبق با StudentDashboard
    const effectiveTotalMinutes = totalLogMinutes > 0
      ? totalLogMinutes
      : (totalItemActualMinutes > 0 ? totalItemActualMinutes : totalPlannedMinutes);

    // ---------- ردیف زمانی روزانه بر اساس تاریخ واقعی لاگ‌ها ----------
    const logsByDate = new Map(); // dateKey -> { minutes, tests }
    for (const plan of plans) {
      for (const day of plan.days || []) {
        for (const item of day.items || []) {
          for (const log of item.itemLogs || []) {
            const t = log.createdAt ? new Date(log.createdAt) : null;
            if (!t || Number.isNaN(t.getTime())) continue;
            const k = dateKey(t);
            let e = logsByDate.get(k);
            if (!e) {
              e = { minutes: 0, tests: 0 };
              logsByDate.set(k, e);
            }
            e.minutes += log.minutes || 0;
            e.tests += log.testsTaken || 0;
          }
        }
      }
    }

    // محدوده‌ی پیمایش: از قدیمی‌ترین روزِ دارای لاگ (حداکثر ۶ هفته) تا امروز.
    // حداقل هفته‌ی جاری همیشه موجود است تا کاربر بتواند قبل/بعد را بکشد.
    const nNow = new Date();
    const today = new Date(nNow.getFullYear(), nNow.getMonth(), nNow.getDate());
    const sixAgo = addDays(today, -6);
    let earliestLog = null;
    for (const k of logsByDate.keys()) {
      const [gy, gm, gd] = k.split('-').map(Number);
      const dt = new Date(gy, gm - 1, gd);
      if (!earliestLog || dt < earliestLog) earliestLog = dt;
    }
    let rangeStart = earliestLog && earliestLog < sixAgo ? earliestLog : sixAgo;
    const floor = addDays(today, -42);
    if (rangeStart < floor) rangeStart = floor;
    const totalDays = Math.max(1, Math.round((today - rangeStart) / 86400000) + 1);

    const subjects = Array.from(bySubject.values())
      .filter((s) => s.studyMinutes > 0 || s.plannedMinutes > 0 || s.byTag.size > 0 || s.otherMinutes > 0)
      .sort((a, b) => b.studyMinutes - a.studyMinutes);

    const tags = Array.from(byTag.values())
      .filter((t) => t.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    const completionRate = totalItems === 0 ? 0 : Math.round((totalDone / totalItems) * 100);
    const goalProgress =
      weeklyGoalMinutes && weeklyGoalMinutes > 0
        ? Math.min(100, Math.round((effectiveTotalMinutes / weeklyGoalMinutes) * 100))
        : null;

    return {
      byDay,
      subjects,
      tags,
      otherEntries,
      totalActualMinutes: effectiveTotalMinutes,
      totalPlannedMinutes,
      totalLogMinutes,
      totalDone,
      totalItems,
      totalTests,
      completionRate,
      goalProgress,
      hasLogs: totalLogMinutes > 0,
      logsByDate,
      rangeStart,
      totalDays,
    };
  }, [plans, weeklyGoalMinutes]);

  // داده‌های نمودار دایره‌ای هدف
  const goalData = useMemo(() => {
    if (!stats.goalProgress) return [];
    return [
      {
        name: 'پیشرفت',
        value: stats.goalProgress,
        fill: stats.goalProgress >= 100 ? '#2BB673' : '#FF8A3D',
      },
    ];
  }, [stats.goalProgress]);

  // رنگ‌ها برای نمودار تگ‌ها
  const tagColors = useMemo(() => {
    return stats.tags.map((_, idx) => TAG_COLORS[idx % TAG_COLORS.length]);
  }, [stats.tags]);

  // ---------- وضعیت پیمایش ردیف زمانی روزانه ----------
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  // ایندکس روزِ «وسط» پنجره؛ null یعنی به‌صورت پیش‌فرض روی امروز باشد
  const [centerIdx, setCenterIdx] = useState(null);
  const effCenter = centerIdx === null
    ? stats.totalDays - 1
    : Math.min(Math.max(centerIdx, 0), stats.totalDays - 1);

  const dragRef = useRef(null);

  // پنجره‌ی هفت‌روزه‌ی مرکز-محور: روز وسط، سه روز قبل و سه روز بعد
  const daily = useMemo(() => {
    const { rangeStart, totalDays, logsByDate, byDay } = stats;
    const winStart = Math.max(0, Math.min(effCenter - 3, totalDays - 7));
    const winEnd = Math.min(winStart + 7, totalDays);
    const arr = [];
    for (let i = winStart; i < winEnd; i++) {
      const d = addDays(rangeStart, i);
      const weekday = (d.getDay() + 1) % 7;
      const [, , jd] = toJalali(d);
      const log = logsByDate.get(dateKey(d));
      const day = byDay[weekday] || { plannedMinutes: 0 };
      arr.push({
        d,
        label: `${SHORT_WEEKDAYS[weekday]} ${toFaDigits(jd)}`,
        isCenter: i === effCenter,
        isToday: sameDay(d, today),
        planned: day.plannedMinutes,
        logged: log ? log.minutes : 0,
        tests: log ? log.tests : 0,
      });
    }
    return arr;
  }, [stats, effCenter, today]);

  const centerDate = useMemo(
    () => formatJalaliDate(addDays(stats.rangeStart, effCenter)),
    [stats.rangeStart, effCenter]
  );

  function onDragStart(e) {
    dragRef.current = {
      startX: e.clientX,
      startCenter: effCenter,
      chartW: Math.max(e.currentTarget.clientWidth, 100),
    };
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragMove(e) {
    if (!dragRef.current) return;
    const barStep = dragRef.current.chartW / 7;
    const delta = Math.round((dragRef.current.startX - e.clientX) / barStep);
    setCenterIdx(dragRef.current.startCenter + delta);
  }

  function endDrag() {
    dragRef.current = null;
  }

  const prevDisabled = effCenter <= 0;
  const nextDisabled = effCenter >= stats.totalDays - 1;

  const dayBarProps = {
    className: 'daily-chart-drag',
    style: { cursor: 'grab', touchAction: 'pan-y' },
    onPointerDown: onDragStart,
    onPointerMove: onDragMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
  };

  return (
    <div className="reports-panel">
      {/* کارت‌های خلاصه */}
      <div className="reports-summary">
        <div className="report-stat-card">
          <div className="rsc-icon">⏱</div>
          <div>
            <div className="rsc-value">{formatMinutes(stats.totalActualMinutes)}</div>
            <div className="rsc-label">مجموع مطالعه</div>
          </div>
        </div>
        <div className="report-stat-card">
          <div className="rsc-icon">✎</div>
          <div>
            <div className="rsc-value">{toFaDigits(stats.totalTests)}</div>
            <div className="rsc-label">کل تست‌های زده‌شده</div>
          </div>
        </div>
        <div className="report-stat-card">
          <div className="rsc-icon">✓</div>
          <div>
            <div className="rsc-value">{toFaDigits(stats.totalDone)}/{toFaDigits(stats.totalItems)}</div>
            <div className="rsc-label">درس‌های انجام‌شده</div>
          </div>
        </div>
        <div className="report-stat-card">
          <div className="rsc-icon">🎯</div>
          <div>
            <div className="rsc-value">{toFaDigits(stats.completionRate)}٪</div>
            <div className="rsc-label">ضریب انجام‌شدگی</div>
          </div>
        </div>
      </div>

      {/* نمودار هدف هفتگی */}
      {stats.goalProgress !== null && (
        <div className="report-card">
          <h3 className="report-card-title">🎯 پیشرفت نسبت به هدف هفتگی</h3>
          <p className="report-card-sub">
            هدف: {formatMinutes(weeklyGoalMinutes)} — انجام‌شده: {formatMinutes(stats.totalActualMinutes)}
          </p>
          <Zoomable>
              <div className="goal-chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart
                    innerRadius="65%"
                    outerRadius="100%"
                    data={goalData}
                    startAngle={90}
                    endAngle={90 - (stats.goalProgress * 360) / 100}
                  >
                    <RadialBar background dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="goal-center-label">
                  <div className="goal-percent">{toFaDigits(stats.goalProgress)}٪</div>
                  <div className="goal-sub">
                    {stats.goalProgress >= 100 ? '🎉 آفرین! هدف رسیدی' : 'به هدف نزدیک می‌شی'}
                  </div>
                </div>
              </div>
            </Zoomable>
        </div>
      )}

      {/* نمودار میله‌ای پویا: مقایسه‌ی زمان برنامه‌ریزی‌شده با ثبت‌شده — پنجره‌ی روز قبل/بعد */}
      <div className="report-card">
        <div className="daily-chart-head">
          <h3 className="report-card-title">📊 مطالعه در هر روز</h3>
          <div className="day-pan">
            <button
              type="button"
              className="day-pan-btn"
              onClick={() => setCenterIdx(effCenter - 1)}
              disabled={prevDisabled}
              aria-label="روز قبل"
            >‹</button>
            <span className="day-pan-label">{centerDate}</span>
            <button
              type="button"
              className="day-pan-btn"
              onClick={() => setCenterIdx(effCenter + 1)}
              disabled={nextDisabled}
              aria-label="روز بعد"
            >›</button>
          </div>
        </div>
        <p className="report-card-sub">
          مقایسه‌ی زمان برنامه‌ریزی‌شده با زمان ثبت‌شده‌ی واقعی (بر حسب ساعت) — روی نمودار بکشید تا روزهای قبل و بعد را ببینید
        </p>
        <div {...dayBarProps}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={daily} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D9" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fill: '#5B6178', fontSize: 11, fontFamily: 'Vazirmatn' }}
                axisLine={{ stroke: '#E8E4D9' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#5B6178', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => toFaDigits(Math.round(v / 60 * 10) / 10)}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFDF8',
                  border: '1px solid #E8E4D9',
                  borderRadius: 8,
                  fontFamily: 'Vazirmatn',
                  fontSize: 13,
                }}
                formatter={(value, name) => {
                  if (name === 'logged') return [formatMinutes(value), 'ثبت‌شده'];
                  return [formatMinutes(value), 'برنامه‌ریزی‌شده'];
                }}
                labelFormatter={(label, payload) => {
                  const p = payload && payload[0] && payload[0].payload;
                  return p && p.d ? `روز: ${formatJalaliDate(p.d)}` : label;
                }}
              />
              <Legend
                content={() => (
                  <div className="chart-legend">
                    <span className="legend-item">
                      <span className="legend-dot" style={{ background: '#C4B8E0' }} />
                      برنامه‌ریزی‌شده
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot" style={{ background: '#2BB673' }} />
                      ثبت‌شده
                    </span>
                  </div>
                )}
              />
              <Bar dataKey="planned" name="planned" radius={[8, 8, 0, 0]}>
                {daily.map((e) => (
                  <Cell
                    key={`p${e.d.toISOString()}`}
                    fill={e.isCenter ? '#B19CE4' : '#C4B8E0'}
                    stroke={e.isCenter ? '#6D28D9' : 'none'}
                    strokeWidth={e.isCenter ? 2 : 0}
                  />
                ))}
              </Bar>
              <Bar dataKey="logged" name="logged" radius={[8, 8, 0, 0]}>
                {daily.map((e) => (
                  <Cell
                    key={`l${e.d.toISOString()}`}
                    fill={e.isCenter ? '#E5521F' : e.isToday ? '#2BB673' : '#FF8A3D'}
                    stroke={e.isCenter ? '#8A2E0C' : 'none'}
                    strokeWidth={e.isCenter ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* نمودار میله‌ای پویا: تعداد تست‌ها — پنجره‌ی روز قبل/بعد */}
      <div className="report-card">
        <div className="daily-chart-head">
          <h3 className="report-card-title">✎ تعداد تست‌های زده‌شده در هر روز</h3>
          <div className="day-pan">
            <button
              type="button"
              className="day-pan-btn"
              onClick={() => setCenterIdx(effCenter - 1)}
              disabled={prevDisabled}
              aria-label="روز قبل"
            >‹</button>
            <span className="day-pan-label">{centerDate}</span>
            <button
              type="button"
              className="day-pan-btn"
              onClick={() => setCenterIdx(effCenter + 1)}
              disabled={nextDisabled}
              aria-label="روز بعد"
            >›</button>
          </div>
        </div>
        <p className="report-card-sub">
          جمع تست‌های ثبت‌شده‌ی روزانه — روی نمودار بکشید تا بین روزها جابه‌جا شوید
        </p>
        <div {...dayBarProps}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D9" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fill: '#5B6178', fontSize: 11, fontFamily: 'Vazirmatn' }}
                axisLine={{ stroke: '#E8E4D9' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#5B6178', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => toFaDigits(v)}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFDF8',
                  border: '1px solid #E8E4D9',
                  borderRadius: 8,
                  fontFamily: 'Vazirmatn',
                  fontSize: 13,
                }}
                formatter={(value) => [toFaDigits(value) + ' تست', 'تعداد']}
                labelFormatter={(label, payload) => {
                  const p = payload && payload[0] && payload[0].payload;
                  return p && p.d ? `روز: ${formatJalaliDate(p.d)}` : label;
                }}
              />
              <Bar dataKey="tests" name="تست‌ها" radius={[8, 8, 0, 0]}>
                {daily.map((e) => (
                  <Cell
                    key={`t${e.d.toISOString()}`}
                    fill={e.isCenter ? '#D63384' : e.isToday ? '#2BB673' : '#FF6B9D'}
                    stroke={e.isCenter ? '#8A1E55' : 'none'}
                    strokeWidth={e.isCenter ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* نمودار دایره‌ای تگ‌ها — بر اساس زمان ثبت‌شده per-tag */}
      {stats.tags.length > 0 && (
        <div className="report-card">
          <h3 className="report-card-title">🏷 زمان مطالعه بر اساس تگ</h3>
          <p className="report-card-sub">
            توزیع زمان ثبت‌شده‌ی دانش‌آموز بین تگ‌های درسی
          </p>
          <Zoomable>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.tags.map((t) => ({ name: t.name, total: t.minutes }))}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {stats.tags.map((_, idx) => (
                    <Cell key={idx} fill={tagColors[idx]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#FFFDF8',
                    border: '1px solid #E8E4D9',
                    borderRadius: 8,
                    fontFamily: 'Vazirmatn',
                    fontSize: 13,
                  }}
                  formatter={(value) => [formatMinutes(value), 'مطالعه']}
                />
                <Legend wrapperStyle={{ fontFamily: 'Vazirmatn', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Zoomable>

          {/* جدول ساده‌شده‌ی تگ‌ها — فقط زمان و تست */}
          <div className="tag-table">
            <div className="tag-row tag-header">
              <div>تگ</div>
              <div>زمان مطالعه</div>
              <div>تعداد تست</div>
            </div>
            {stats.tags.map((t, idx) => (
              <div key={idx} className="tag-row">
                <div className="tag-name-cell">
                  <span
                    className="tag-color-dot"
                    style={{ background: tagColors[idx % tagColors.length] }}
                  />
                  {t.name}
                </div>
                <div>{formatMinutes(t.minutes)}</div>
                <div>{toFaDigits(t.tests)}</div>
              </div>
            ))}
            <div className="tag-row tag-total">
              <div>مجموع</div>
              <div>{formatMinutes(stats.tags.reduce((s, t) => s + t.minutes, 0))}</div>
              <div>{toFaDigits(stats.tags.reduce((s, t) => s + t.tests, 0))}</div>
            </div>
          </div>
        </div>
      )}

      {/* جدول دروس با جزئیات per-tag */}
      {stats.subjects.length > 0 && (
        <div className="report-card">
          <h3 className="report-card-title">
            {variant === 'student' ? '📚 زمانی که برای هر درس گذاشتی' : '📚 زمان مطالعه‌ی هر درس به تفکیک تگ'}
          </h3>
          <p className="report-card-sub">
            {variant === 'student'
              ? 'برای هر درس، ببین چقدر برای هر تگ وقت گذاشتی'
              : 'برای هر درس، زمانی که برای هر تگ اختصاص داده شده نمایش داده می‌شود'}
          </p>
          <div className={`subject-detail-list ${variant === 'student' ? 'student-view' : ''}`}>
            {stats.subjects.map((s, idx) => {
              const color = TAG_COLORS[idx % TAG_COLORS.length];
              const tagEntries = Array.from(s.byTag.entries());
              const hasOther = s.otherMinutes > 0 || s.otherNotes.length > 0;
              return (
                <div
                  key={idx}
                  className={`subject-detail-card ${variant === 'student' ? 'student-card' : ''}`}
                  style={variant === 'student' ? { borderRightColor: color } : undefined}
                >
                  <div className="subject-detail-head">
                    <span className="subject-detail-name" style={{ borderRightColor: color }}>
                      {variant === 'student' ? '📖' : ''} {s.name}
                    </span>
                    <span className="subject-detail-total">
                      {variant === 'student' ? 'مجموع: ' : ''}{formatMinutes(s.studyMinutes)}
                      {s.tests > 0 && ` · ✎ ${toFaDigits(s.tests)} تست`}
                    </span>
                  </div>
                  <div className="subject-detail-tags">
                    {tagEntries.map(([tagName, data], tIdx) => (
                      <div
                        key={tIdx}
                        className={`subject-detail-tag ${variant === 'student' ? 'student-tag' : ''}`}
                      >
                        <span className="sd-tag-name">
                          <span className="sd-tag-dot" style={{ background: color }} />
                          {tagName}
                        </span>
                        <span className="sd-tag-min">{formatMinutes(data.minutes)}</span>
                        {data.tests > 0 && (
                          <span className="sd-tag-tests">✎ {toFaDigits(data.tests)} تست</span>
                        )}
                      </div>
                    ))}
                    {/* «سایر کارها» برای این درس */}
                    {hasOther && (
                      <div className={`subject-detail-tag sd-other ${variant === 'student' ? 'student-tag' : ''}`}>
                        <span className="sd-tag-name">
                          <span className="sd-tag-dot" style={{ background: '#FF8A3D' }} />
                          📌 سایر کارها
                        </span>
                        {s.otherMinutes > 0 && (
                          <span className="sd-tag-min">{formatMinutes(s.otherMinutes)}</span>
                        )}
                        {s.otherTests > 0 && (
                          <span className="sd-tag-tests">✎ {toFaDigits(s.otherTests)} تست</span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* توضیحات سایر کارهای این درس — در حالت student به سبک دوستانه‌تر */}
                  {s.otherNotes.length > 0 && (
                    <div className={`subject-other-notes ${variant === 'student' ? 'student-other' : ''}`}>
                      {variant === 'student' && (
                        <div className="other-notes-title">💡 کارهای اضافه‌ای که کردی:</div>
                      )}
                      {s.otherNotes.map((n, nIdx) => (
                        <div key={nIdx} className="other-note-row">
                          <span className="other-note-icon">📌</span>
                          <span className="other-note-text">{n.note}</span>
                          <span className="other-note-time">{formatMinutes(n.minutes)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* بخش جداگانه‌ی «سایر کارها» با همه‌ی توضیحات */}
      {stats.otherEntries.length > 0 && (
        <div className="report-card other-entries-card">
          <h3 className="report-card-title">
            {variant === 'student' ? '📌 کارهای خارج از برنامه‌ای که کردی' : '📌 سایر کارهای دانش‌آموز'}
          </h3>
          <p className="report-card-sub">
            {variant === 'student'
              ? 'کارهایی که در تگ‌های درسی جای نگرفتن ولی انجامش دادی'
              : 'کارهایی که در تگ‌های درسی جای نگرفته‌اند، با توضیح دانش‌آموز'}
          </p>
          <div className="other-entries-list">
            {stats.otherEntries.map((e, idx) => (
              <div
                key={idx}
                className={`other-entry-row ${variant === 'student' ? 'student-entry' : ''}`}
              >
                <div className="other-entry-head">
                  <span className="other-entry-subject">{e.subject}</span>
                  <span className="other-entry-time">{formatMinutes(e.minutes)}</span>
                  {e.tests > 0 && (
                    <span className="other-entry-tests">✎ {toFaDigits(e.tests)} تست</span>
                  )}
                </div>
                <div className="other-entry-note">
                  {variant === 'student' ? '✏️ ' : ''}{e.note}
                </div>
              </div>
            ))}
          </div>
          <div className={`other-entries-total ${variant === 'student' ? 'student-total' : ''}`}>
            {variant === 'student' ? 'مجموع کارهای اضافه: ' : 'مجموع سایر کارها: '}
            {formatMinutes(stats.otherEntries.reduce((s, e) => s + e.minutes, 0))}
            {stats.otherEntries.reduce((s, e) => s + e.tests, 0) > 0 && (
              <> · ✎ {toFaDigits(stats.otherEntries.reduce((s, e) => s + e.tests, 0))} تست</>
            )}
          </div>
        </div>
      )}

      {/* پیام خالی */}
      {stats.totalItems === 0 && (
        <div className="empty-card">
          <span className="empty-emoji" aria-hidden>📊</span>
          <p>
            {variant === 'student'
              ? 'هنوز داده‌ای برای نمایش نداری. وقتی مشاورت برنامه‌ات رو بسازد و تو برای هر درس وقت بذاری، اینجا آمار کامل می‌شه.'
              : 'هنوز داده‌ای برای نمایش آمار نداری. وقتی مشاورت برنامه‌ات رو بسازد و تو درس‌ها رو انجام بدی، اینجا آمار کامل می‌شه.'}
          </p>
        </div>
      )}
    </div>
  );
}
