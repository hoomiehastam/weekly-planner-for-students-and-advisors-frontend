import { useMemo, useLayoutEffect, useRef, useState } from 'react';
import { DAY_NAMES } from '../utils/dayNames';
import { toFaDigits } from '../utils/jalali';

// نمایش برنامه‌ی هفتگی به‌صورت تقویم (مثل Google Calendar)
// هر بازه‌ی درسی که ساعت شروع/پایان دارد، به‌صورت یک بلوک رنگی در جای مناسب نمایش داده می‌شود.
// آیتم‌های بدون ساعت، در پایین هر ستون به‌صورت لیست نمایش داده می‌شوند.
//
// این کامپوننت خودش را با عرضِ ظرفِ خودش تطبیق می‌دهد:
// اگر ظرف از عرض طبیعیِ تقویم (۷۲۰px) باریک‌تر باشد، کل تقویم با CSS zoom کوچک می‌شود
// تا همه‌ی اعداد و بلوک‌ها داخل چارچوب بمانند. کاربر هم می‌تواند با دکمه‌های +/-
// یا Ctrl+چرخ‌ماوس یا دوبار-لمس، زوم را تغییر دهد.

const HOUR_HEIGHT = 56; // ارتفاع هر ساعت به پیکسل
const START_HOUR = 6; // نمایش از ساعت ۶ صبح
const END_HOUR = 24; // تا ساعت ۲۴ شب
const TOTAL_HOURS = END_HOUR - START_HOUR;

// رنگ‌ها برای هر درس؛ بر اساس هش نام درس انتخاب می‌شود
const COLORS = [
  { bg: '#ECE9FF', border: '#4A3FBE', text: '#2D2680' },   // indigo
  { bg: '#FFE3CC', border: '#FF8A3D', text: '#8A4A18' },   // amber
  { bg: '#D8F2E5', border: '#2BB673', text: '#1D6D4C' },   // sage
  { bg: '#FFD6E5', border: '#FF6B9D', text: '#8A2854' },   // pink
  { bg: '#CFF1ED', border: '#14B8A6', text: '#0E6B62' },   // teal
  { bg: '#DBEAFE', border: '#3B82F6', text: '#1E3A8A' },   // sky
  { bg: '#F3E8FF', border: '#9333EA', text: '#5B21B6' },   // purple
  { bg: '#FCE7F3', border: '#EC4899', text: '#831843' },   // magenta
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

function getColorForSubject(subject) {
  const idx = hashString(subject || '') % COLORS.length;
  return COLORS[idx];
}

// تبدیل "HH:MM" به تعداد دقیقه از نیمه‌شب
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// محاسبه‌ی موقعیت و ارتفاع یک بلوک بر اساس ساعت شروع/پایان
function computeBlockPosition(startTime, endTime) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (startMin === null || endMin === null) return null;

  const dayStartMin = START_HOUR * 60;
  const dayEndMin = END_HOUR * 60;

  // محدود کردن به محدوده‌ی نمایش
  const clampedStart = Math.max(startMin, dayStartMin);
  const clampedEnd = Math.min(endMin, dayEndMin);

  if (clampedEnd <= clampedStart) return null;

  const topMin = clampedStart - dayStartMin;
  const heightMin = clampedEnd - clampedStart;

  return {
    top: (topMin / 60) * HOUR_HEIGHT,
    height: Math.max((heightMin / 60) * HOUR_HEIGHT, 24),
  };
}

// ستون یک روز
function DayColumn({ dayName, items, onToggle }) {
  const timedItems = items.filter((it) => it.startTime && it.endTime);
  const untimedItems = items.filter((it) => !it.startTime || !it.endTime);

  return (
    <div className="cal-day-col">
      <div className="cal-day-header">
        <span className="cal-day-name">{dayName}</span>
        {items.length > 0 && (
          <span className="cal-day-count">
            {toFaDigits(items.filter((i) => i.status === 'DONE').length)}/{toFaDigits(items.length)}
          </span>
        )}
      </div>
      <div className="cal-day-body" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
        {/* خطوط ساعت */}
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
          <div
            key={i}
            className="cal-hour-line"
            style={{ top: i * HOUR_HEIGHT }}
          />
        ))}

        {/* بلوک‌های زمان‌دار */}
        {timedItems.map((item) => {
          const pos = computeBlockPosition(item.startTime, item.endTime);
          if (!pos) return null;
          const color = getColorForSubject(item.subject);
          const isDone = item.status === 'DONE';
          return (
            <button
              key={item.id}
              type="button"
              className={`cal-event ${isDone ? 'is-done' : ''}`}
              style={{
                top: pos.top,
                height: pos.height,
                backgroundColor: color.bg,
                borderColor: color.border,
                color: color.text,
              }}
              onClick={() => onToggle && onToggle(item)}
              title={`${item.subject}${item.description ? ' — ' + item.description : ''}`}
            >
              <div className="cal-event-time">{toFaDigits(item.startTime)} - {toFaDigits(item.endTime)}</div>
              <div className="cal-event-title">{item.subject}</div>
              {item.tags && item.tags.length > 0 && pos.height > 50 && (
                <div className="cal-event-tags">
                  {item.tags.map((t) => (
                    <span key={t.tag.id} className="cal-tag">{t.tag.name}</span>
                  ))}
                </div>
              )}
              {isDone && pos.height > 70 && (item.actualMinutes || item.testsTaken) && (
                <div className="cal-event-progress">
                  {item.actualMinutes && <span>⏱ {toFaDigits(item.actualMinutes)}′</span>}
                  {item.testsTaken && <span>✎ {toFaDigits(item.testsTaken)}</span>}
                </div>
              )}
              {isDone && <span className="cal-check">✓</span>}
            </button>
          );
        })}
      </div>

      {/* آیتم‌های بدون ساعت — پایین ستون، خارج از بدنه‌ی ساعتی (در جریان عادی) */}
      {untimedItems.length > 0 && (
        <div className="cal-untimed">
          {untimedItems.map((item) => {
            const color = getColorForSubject(item.subject);
            const isDone = item.status === 'DONE';
            return (
              <button
                key={item.id}
                type="button"
                className={`cal-untimed-item ${isDone ? 'is-done' : ''}`}
                style={{
                  backgroundColor: color.bg,
                  borderColor: color.border,
                  color: color.text,
                }}
                onClick={() => onToggle && onToggle(item)}
                title={item.subject}
              >
                {isDone && <span className="cal-check-small">✓</span>}
                <span className="cal-untimed-title">{item.subject}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// props:
//   plans: آرایه‌ی برنامه‌ها (هر برنامه days دارد)
//   onToggleItem: (item) => void — اختیاری، برای تغییر وضعیت انجام‌شده
export default function WeeklyCalendarView({ plans, onToggleItem }) {
  // تجمیع آیتم‌ها بر اساس روز هفته از همه‌ی برنامه‌ها
  const daysByWeekday = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => []);
    for (const plan of plans) {
      for (const day of plan.days || []) {
        if (day.dayOfWeek >= 0 && day.dayOfWeek <= 6) {
          buckets[day.dayOfWeek].push(...day.items);
        }
      }
    }
    return buckets;
  }, [plans]);

  // ساعت‌هایی که در محور سمت چپ نمایش می‌دهیم
  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      labels.push(`${toFaDigits(String(h).padStart(2, '0'))}:۰۰`);
    }
    return labels;
  }, []);

  // ---------- خود‌تطبیقی: اگر ظرف باریک‌تر از ۷۲۰px باشد، تقویم کوچک می‌شود ----------
  const frameRef = useRef(null);
  const innerRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const lastTapRef = useRef(0);
  const pinchRef = useRef({ d0: 0, z0: 1 });
  const pointersRef = useRef(new Map());

  const clampZoom = (z) => Math.min(3, Math.max(0.5, Math.round(z * 100) / 100));
  const effectiveScale = clampZoom(fitScale * zoom);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;

    const measure = () => {
      const fw = frame.clientWidth;
      const iw = inner.scrollWidth;
      setFitScale(Math.min(1, fw / Math.max(iw, 1)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? 0.25 : -0.25)));
  }

  function onPointerDown(e) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        z0: zoom,
      };
    }
  }

  function onPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ref = pinchRef.current;
      if (ref.d0 > 0) {
        setZoom(() => clampZoom(ref.z0 * (d / ref.d0)));
      }
    }
  }

  function onPointerUp(e) {
    pointersRef.current.delete(e.pointerId);
  }

  function onFrameClick(e) {
    if (e.detail !== 2) return; // دوبار-کلیک
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setZoom((z) => (Math.abs(z - 1) < 0.05 ? 2 : 1));
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  return (
    <div className="weekly-zoom-wrap">
      <div className="weekly-zoom-bar">
        <span className="root">{toFaDigits(Math.round(effectiveScale * 100))}٪</span>
        <button type="button" className="zoom-btn" onClick={() => setZoom(clampZoom(zoom - 0.25))} aria-label="کوچک‌تر">−</button>
        <button type="button" className="zoom-btn" onClick={() => setZoom(clampZoom(zoom + 0.25))} aria-label="بزرگ‌تر">+</button>
        {zoom !== 1 && (
          <button type="button" className="zoom-btn zoom-reset" onClick={() => setZoom(1)}>↺</button>
        )}
      </div>
      <div
        className="weekly-calendar-frame"
        ref={frameRef}
        onWheel={onWheel}
        onClick={onFrameClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div
          ref={innerRef}
          className="weekly-calendar"
          style={{ zoom: effectiveScale }}
        >
          <div className="cal-grid">
            {/* ستون ساعت */}
            <div className="cal-time-col">
              <div className="cal-day-header-spacer" />
              <div className="cal-time-list" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                {hourLabels.map((label, idx) => (
                  <div
                    key={idx}
                    className="cal-time-label"
                    style={{ top: idx * HOUR_HEIGHT }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* هفت ستون روز */}
            {DAY_NAMES.map((dayName, idx) => (
              <DayColumn
                key={idx}
                dayName={dayName}
                items={daysByWeekday[idx] || []}
                onToggle={onToggleItem}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}