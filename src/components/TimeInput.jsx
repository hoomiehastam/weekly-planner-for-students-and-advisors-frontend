import { forwardRef, useEffect, useState } from 'react';
import { toLatinDigits } from '../utils/jalali';

// ورودی ساعت (۲۴ ساعته، مثل ۱۹:۳۰) که:
//   - ارقام فارسی، عربی و لاتین را می‌پذیرد؛ لازم نیست کیبورد انگلیسی باشد
//   - دو نقطه را خودش می‌گذارد (فقط ارقام را تایپ کن: ۱۹۳۰ ← 19:30)
//   - رقم‌های بی‌معنی را اصلاح می‌کند (۷ ← 07 ، ساعت ۲۵ ممکن نیست ، دقیقه ۶۰ ممکن نیست)
//   - وقتی ساعت کامل شد، onComplete صدا زده می‌شود (برای رفتن خودکار به فیلد بعدی)
// مقدار خروجی onChange همیشه «HH:MM» با ارقام لاتین است، یا رشته‌ی خالی اگر هنوز کامل نیست؛
// پس بقیه‌ی منطق برنامه (اعتبارسنجی و ارسال به سرور) بدون تغییر کار می‌کند.
//
// props:
//   value: رشته‌ی «HH:MM» یا خالی
//   onChange(value)
//   onComplete?(value)
//   ...rest: بقیه‌ی ویژگی‌های ورودی (placeholder، required و …)

// فقط ارقام را نگه می‌دارد و رقم‌های غیرممکن را اصلاح می‌کند (حداکثر ۴ رقم)
function cleanDigits(raw) {
  let d = toLatinDigits(raw).replace(/\D/g, '').slice(0, 4);
  if (d.length >= 1 && d[0] > '2') d = `0${d}`.slice(0, 4); // «7» یعنی ۰۷
  if (d.length >= 2 && d[0] === '2' && d[1] > '3') d = `${d[0]}3${d.slice(2)}`; // ساعت حداکثر ۲۳
  if (d.length >= 3 && d[2] > '5') d = `${d.slice(0, 2)}0${d[2]}`.slice(0, 4); // «۷» در دقیقه یعنی ۰۷
  return d;
}

function format(d) {
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

const TimeInput = forwardRef(function TimeInput({ value, onChange, onComplete, ...rest }, ref) {
  const [text, setText] = useState(value || '');

  // هماهنگی با مقدار بیرونی (مثلاً بارگذاری برنامه‌ی ذخیره‌شده)
  useEffect(() => {
    const current = /^\d{2}:\d{2}$/.test(text) ? text : '';
    if ((value || '') !== current) setText(value || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e) {
    const digits = cleanDigits(e.target.value);
    const formatted = format(digits);
    const wasComplete = /^\d{2}:\d{2}$/.test(text);
    setText(formatted);
    if (digits.length === 4) {
      onChange(formatted);
      if (!wasComplete) onComplete?.(formatted);
    } else {
      onChange('');
    }
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoCorrect="off"
      spellCheck="false"
      dir="ltr"
      maxLength={5}
      placeholder="--:--"
      className="time-input"
      value={text}
      onChange={handleChange}
      onFocus={(e) => e.target.select()}
      {...rest}
    />
  );
});

export default TimeInput;
