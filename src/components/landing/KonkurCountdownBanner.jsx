import { useEffect, useState } from 'react';
import { fetchKonkurDate } from '../../api/client';
import { toFaDigits, formatJalaliDate } from '../../utils/jalali';

// شمارنده‌ی زنده‌ی «تا کنکور» در لندینگ — تاریخ فقط توسط سوپرادمین از پنل مدیریت تعیین می‌شود.
//   • فرمت جدید: سه حباب عددی (روز/ساعت/دقیقه) + تاریخ جلالی آزمون — به‌جای چیپ متنی کوچک
//   • محل جدید: بالای عنوان hero، تمام‌عرضِ محتوا و قابل‌دیدن بدون اسکرول
// اگر تاریخی ثبت نشده باشد یا کنکور گذشته باشد، اصلاً رندر نمی‌شود.
// تیک هر دقیقه با setInterval با cleanup درست — بدون هیچ حرکت دائمی سنگین.

function diffParts(target) {
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { done: true, days: 0, hours: 0, minutes: 0 };
  return {
    done: false,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
  };
}

export default function KonkurCountdownBanner() {
  const [target, setTarget] = useState(null); // Date نیمه‌شبِ روز کنکور
  const [parts, setParts] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchKonkurDate()
      .then((data) => {
        if (!alive || !data.konkurDate) return;
        const t = new Date(`${data.konkurDate}T00:00:00`);
        if (Number.isNaN(t.getTime())) return;
        setTarget(t);
      })
      .catch(() => {}); // شکست در گرفتن تاریخ نباید لندینگ را بشکند
    return () => {
      alive = false;
    };
  }, []);

  // تیک هر ۳۰ ثانیه — شمارنده زنده می‌ماند و دقیقه‌ها پایین می‌آید
  useEffect(() => {
    if (!target) return undefined;
    function tick() {
      setParts(diffParts(target));
    }
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [target]);

  if (!target || !parts || parts.done) return null;

  const jDate = formatJalaliDate(target, { withYear: true });
  const cells = [
    { value: parts.days, label: parts.days === 1 ? 'روز' : 'روز' },
    { value: parts.hours, label: 'ساعت' },
    { value: parts.minutes, label: 'دقیقه' },
  ];

  return (
    <div className="konkur-countdown" role="status" aria-label={`شمارش معکوس تا کنکور — ${jDate}`}>
      <div className="kc-head">
        <span className="kc-title">تا کنکور</span>
        <span className="kc-date">{jDate}</span>
      </div>
      <div className="kc-cells">
        {cells.map((c) => (
          <div className="kc-cell" key={c.label}>
            <span className="kc-num">{toFaDigits(c.value)}</span>
            <span className="kc-label">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
