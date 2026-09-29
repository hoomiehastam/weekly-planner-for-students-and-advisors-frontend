import { toLatinDigits } from '../utils/jalali';

// ورودی عددی که ارقام فارسی (۰-۹) و عربی (٠-٩) را هم می‌پذیرد؛
// بدون اینکه کاربر مجبور باشد زبان کیبورد را عوض کند.
// مقدار ذخیره‌شده همیشه با ارقام لاتینِ بدون جداکننده است تا منطق برنامه بدون تغییر بماند.
//
// props:
//   value: رشته یا عدد
//   onChange: (latinDigitString) => void
//   decimals: تعداد اعشار مجاز (پیش‌فرض ۰ = فقط عدد صحیح)
//   grouping: با true، ارقام هر سه رقم با «،» جدا می‌شوند (مثل مبلغ‌ها: ۵۰۰٬۰۰۰)
export default function FaNumberInput({ value, onChange, decimals = 0, maxLength, grouping = false, ...rest }) {
  function handleChange(e) {
    let raw = toLatinDigits(e.target.value);

    if (decimals && decimals > 0) {
      // فقط ارقام و یک ممیز (لاتین یا فارسی)
      raw = raw
        .replace(/٫/g, '.')
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1');
      const [intPart, decPart] = raw.split('.');
      if (decPart !== undefined) raw = `${intPart}.${decPart.slice(0, decimals)}`;
    } else {
      raw = raw.replace(/\D/g, '');
    }

    if (maxLength && raw.length > maxLength) raw = raw.slice(0, maxLength);
    onChange(raw);
  }

  // نمایش گروه‌بندی‌شده: ۱۲۳۴۵۶۷ → 1,234,567 (ارقام لاتین داخل input تا مکان‌نما جابه‌جا نشود)
  const displayValue = grouping && value != null && value !== ''
    ? Number(value).toLocaleString('en-US')
    : (value ?? '');

  return (
    <input
      type="text"
      inputMode={decimals && decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete="off"
      autoCorrect="off"
      spellCheck="false"
      value={displayValue}
      onChange={handleChange}
      {...rest}
    />
  );
}
