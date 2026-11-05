import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  toJalali,
  jalaliToGregorianDate,
  getJalaliWeekday,
  jalaaliMonthLength,
  J_MONTH_NAMES,
  WEEKDAY_NAMES,
  toFaDigits,
} from '../utils/jalali';
import Ico from './Ico';

const WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// رشته‌ی فقط‌تاریخ (YYYY-MM-DD) را روی ظهرِ همان روز محلی می‌خواند تا در هیچ منطقه‌ی زمانی
// یک روز جابه‌جا نشود؛ رشته‌های کامل (ISO) مثل قبل خوانده می‌شوند.
function parseValue(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  return new Date(value);
}

// ساخت آرایه‌ی روزهای یک ماه با placeholderهای ابتدا و انتها برای چیدمان صحیح
function buildMonthGrid(jy, jm) {
  const firstWeekday = getJalaliWeekday(jy, jm, 1);
  const daysInMonth = jalaaliMonthLength(jy, jm);
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const tail = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < tail; i++) cells.push(null);
  return cells;
}

// تقویم شمسی کامل با قابلیت انتخاب تاریخ
// props:
//   value: رشته‌ی YYYY-MM-DD میلادی
//   onChange: (gregorianDateString) => void
//   label: اختیاری
//   placeholder: اختیاری
export default function JalaliDatePicker({ value, onChange, label: _label, placeholder }) {
  const initial = useMemo(() => {
    if (!value) return null;
    const d = parseValue(value);
    if (Number.isNaN(d.getTime())) return null;
    return toJalali(d);
  }, [value]);

  const today = useMemo(() => toJalali(new Date()), []);
  const [viewYear, setViewYear] = useState(initial ? initial[0] : today[0]);
  const [viewMonth, setViewMonth] = useState(initial ? initial[1] : today[1]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const calRef = useRef(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });

  // محاسبه موقعیت تقویم نسبت به دکمه‌ی ورودی
  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const calWidth = 320;
      const calHeight = 360;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = rect.left;
      // اگر تقویم از سمت راست صفحه خارج می‌شود
      if (left + calWidth > viewportWidth - 8) {
        left = viewportWidth - calWidth - 8;
        if (left < 8) left = 8;
      }

      let top = rect.bottom + 6;
      // اگر تقویم از پایین صفحه خارج می‌شود، بالای دکمه باز شود
      if (top + calHeight > viewportHeight - 8) {
        top = rect.top - calHeight - 6;
        if (top < 8) top = 8;
      }

      setCalPos({ top, left });
    }
  }, [open]);

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function prevYear() {
    setViewYear((y) => y - 1);
  }

  function nextYear() {
    setViewYear((y) => y + 1);
  }

  function selectDay(jd) {
    const gregorianStr = jalaliToGregorianDate(viewYear, viewMonth, jd);
    onChange(gregorianStr);
    setOpen(false);
  }

  function goToToday() {
    setViewYear(today[0]);
    setViewMonth(today[1]);
  }

  const displayValue = initial
    ? `${toFaDigits(initial[0])}/${toFaDigits(String(initial[1]).padStart(2, '0'))}/${toFaDigits(String(initial[2]).padStart(2, '0'))} — ${J_MONTH_NAMES[initial[1] - 1]} ${toFaDigits(initial[2])}، ${toFaDigits(initial[0])}`
    : placeholder || 'انتخاب تاریخ';

  return (
    <div className="jalali-datepicker">
      <button
        ref={inputRef}
        type="button"
        className="jdp-input"
        onClick={() => {
          // با هر بار باز شدن، تقویم روی تاریخ انتخاب‌شده (یا امروز) می‌ایستد
          if (!open) {
            const base = initial || today;
            setViewYear(base[0]);
            setViewMonth(base[1]);
          }
          setOpen((o) => !o);
        }}
      >
        <span className="jdp-icon"><Ico e="📅" /></span>
        <span className="jdp-value">{displayValue}</span>
        <span className="jdp-caret">{open ? '▴' : '▾'}</span>
      </button>

      {/* با پورتال به body می‌رود تا کارت‌های دارای افکت (چرخش/محو) جای ثابت تقویم را جابه‌جا یا بُرش نزنند */}
      {open && createPortal(
        <>
          <div className="jdp-overlay" onClick={() => setOpen(false)} />
          <div
            ref={calRef}
            className="jdp-calendar"
            style={{
              position: 'fixed',
              top: `${calPos.top}px`,
              left: `${calPos.left}px`,
            }}
          >
            <div className="jdp-header">
              <button type="button" className="jdp-nav" onClick={prevYear} title="سال قبل">
                «
              </button>
              <button type="button" className="jdp-nav" onClick={prevMonth} title="ماه قبل">
                ›
              </button>
              <div className="jdp-title">
                {J_MONTH_NAMES[viewMonth - 1]} {toFaDigits(viewYear)}
              </div>
              <button type="button" className="jdp-nav" onClick={nextMonth} title="ماه بعد">
                ‹
              </button>
              <button type="button" className="jdp-nav" onClick={nextYear} title="سال بعد">
                »
              </button>
            </div>

            <div className="jdp-weekdays">
              {WEEKDAY_SHORT.map((d, i) => (
                <div key={i} className="jdp-weekday">
                  {d}
                </div>
              ))}
            </div>

            <div className="jdp-grid">
              {monthGrid.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} className="jdp-empty" />;
                }
                const isToday =
                  today[0] === viewYear && today[1] === viewMonth && today[2] === day;
                const isSelected =
                  initial && initial[0] === viewYear && initial[1] === viewMonth && initial[2] === day;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`jdp-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => selectDay(day)}
                  >
                    {toFaDigits(day)}
                  </button>
                );
              })}
            </div>

            <div className="jdp-footer">
              <button type="button" className="jdp-today-btn" onClick={goToToday}>
                امروز: {WEEKDAY_NAMES[getJalaliWeekday(today[0], today[1], today[2])]}، {toFaDigits(today[2])} {J_MONTH_NAMES[today[1] - 1]}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
