import { useMemo, useLayoutEffect, useRef, useState } from 'react';
import { DAY_NAMES } from '../utils/dayNames';
import { toFaDigits } from '../utils/jalali';
import Ico from './Ico';
import { fullItemTitle, topicLabel } from '../utils/planItem';

// نمایش برنامه‌ی هفتگی به‌صورت تقویم (مثل Google Calendar)
// هر بازه‌ی درسی که ساعت شروع/پایان دارد، به‌صورت یک بلوک رنگی در جای مناسب نمایش داده می‌شود.
// آیتم‌های بدون ساعت، در پایین هر ستون به‌صورت لیست نمایش داده می‌شوند.
//
// این کامپوننت خودش را با عرضِ ظرفِ خودش تطبیق می‌دهد:
// اگر ظرف از عرض طبیعیِ تقویم (۷۲۰px) باریک‌تر باشد، کل تقویم با CSS zoom کوچک می‌شود
// تا همه‌ی اعداد و بلوک‌ها داخل چارچوب بمانند. کاربر هم می‌تواند با دکمه‌های +/-
// یا Ctrl+چرخ‌ماوس یا دوبار-لمس، زوم را تغییر دهد.

const HOUR_HEIGHT = 56; // ارتفاع هر ساعت به پیکسل
const DEFAULT_START_HOUR = 6; // نمایش پیش‌فرض از ساعت ۶ صبح
const DEFAULT_END_HOUR = 24; // تا ساعت ۲۴ شب
// حداقل ارتفاع یک بلوک (برای خوانایی). بلوک‌های کوتاه‌تر از ~۲۰ دقیقه به همین اندازه کشیده می‌شوند.
const MIN_BLOCK_HEIGHT = 20;

// رنگ‌ها برای هر درس؛ بر اساس هش نام درس انتخاب می‌شود
const COLORS = [
  { bg: '#F1EFE8', border: '#1B1F3B', text: '#1B1F3B' },   // indigo
  { bg: '#FBE7D6', border: '#E8643C', text: '#B8501E' },   // amber
  { bg: '#DCF0E7', border: '#1B8A6B', text: '#0F6E56' },   // sage
  { bg: '#FBEFD9', border: '#F2A93B', text: '#B8791E' },   // pink
  { bg: '#EAF3DE', border: '#3B6D11', text: '#3B6D11' },   // teal
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

// محاسبه‌ی موقعیت و ارتفاع یک بلوک بر اساس ساعت شروع/پایان.
// مقیاس ثابت است: هر ساعت = HOUR_HEIGHT پیکسل؛ پس «۱۶:۰۰ تا ۱۷:۳۰» دقیقاً ۱٫۵ × ۵۶ = ۸۴ پیکسل است.
// بازه‌ی نمایش (startHour..endHour) از روی خود بازه‌ها گسترش می‌یابد تا هیچ بلوکی بریده/کوتاه‌شده رسم نشود.
export function computeBlockPosition(startTime, endTime, startHour = DEFAULT_START_HOUR, endHour = DEFAULT_END_HOUR) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (startMin === null || endMin === null) return null;
  if (endMin <= startMin) return null;

  const dayStartMin = startHour * 60;
  const dayEndMin = endHour * 60;
  const clampedStart = Math.max(startMin, dayStartMin);
  const clampedEnd = Math.min(endMin, dayEndMin);
  if (clampedEnd <= clampedStart) return null;

  return {
    top: ((clampedStart - dayStartMin) / 60) * HOUR_HEIGHT,
    height: Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT),
  };
}

// ستون یک روز
function DayColumn({ dayName, items, onToggle, startHour, endHour }) {
  const totalHours = endHour - startHour;
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
      <div className="cal-day-body" style={{ height: totalHours * HOUR_HEIGHT }}>
        {/* خطوط ساعت */}
        {Array.from({ length: totalHours + 1 }, (_, i) => (
          <div
            key={i}
            className="cal-hour-line"
            style={{ top: i * HOUR_HEIGHT }}
          />
        ))}

        {/* بلوک‌های زمان‌دار */}
        {timedItems.map((item) => {
          const pos = computeBlockPosition(item.startTime, item.endTime, startHour, endHour);
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
              title={`${fullItemTitle(item)}${item.description ? ' — ' + item.description : ''}`}
            >
              <div className="cal-event-time">{toFaDigits(item.startTime)} - {toFaDigits(item.endTime)}</div>
              <div className="cal-event-title">{item.subject}</div>
              {topicLabel(item) && pos.height > 44 && <div className="cal-event-topic">{topicLabel(item)}</div>}
              {item.tags && item.tags.length > 0 && pos.height > 50 && (
                <div className="cal-event-tags">
                  {item.tags.map((t) => (
                    <span key={t.tag.id} className="cal-tag">{t.tag.name}</span>
                  ))}
                </div>
              )}
              {isDone && pos.height > 70 && (item.actualMinutes || item.testsTaken) && (
                <div className="cal-event-progress">
                  {item.actualMinutes && <span><Ico e="⏱" /> {toFaDigits(item.actualMinutes)}′</span>}
                  {item.testsTaken && <span><Ico e="✎" /> {toFaDigits(item.testsTaken)}</span>}
                </div>
              )}
              {isDone && <span className="cal-check"><Ico e="✓" /></span>}
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
                title={fullItemTitle(item)}
              >
                {isDone && <span className="cal-check-small"><Ico e="✓" /></span>}
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

  // بازه‌ی ساعتیِ نمایش: حداقل ۶ تا ۲۴؛ اگر بازه‌ای زودتر شروع یا دیرتر تمام شود، محور گسترش می‌یابد
  const { startHour, endHour } = useMemo(() => {
    let lo = DEFAULT_START_HOUR;
    let hi = DEFAULT_END_HOUR;
    for (const bucket of daysByWeekday) {
      for (const it of bucket) {
        const a = timeToMinutes(it.startTime);
        const b = timeToMinutes(it.endTime);
        if (a === null || b === null || b <= a) continue;
        lo = Math.min(lo, Math.floor(a / 60));
        hi = Math.max(hi, Math.min(24, Math.ceil(b / 60)));
      }
    }
    return { startHour: lo, endHour: hi };
  }, [daysByWeekday]);
  const totalHours = endHour - startHour;

  // ساعت‌هایی که در محور سمت چپ نمایش می‌دهیم
  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = startHour; h <= endHour; h++) {
      labels.push(`${toFaDigits(String(h).padStart(2, '0'))}:۰۰`);
    }
    return labels;
  }, [startHour, endHour]);

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
              <div className="cal-time-list" style={{ height: totalHours * HOUR_HEIGHT }}>
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
                startHour={startHour}
                endHour={endHour}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}