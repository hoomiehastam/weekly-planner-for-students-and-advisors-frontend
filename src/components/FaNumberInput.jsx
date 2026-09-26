import { toLatinDigits } from '../utils/jalali';

// ورودی عددی که ارقام فارسی (۰-۹) و عربی (٠-٩) را هم می‌پذیرد؛
// بدون اینکه کاربر مجبور باشد زبان کیبورد را عوض کند.
// مقدار ذخیره‌شده همیشه با ارقام لاتین است تا منطق برنامه بدون تغییر بماند.
//
// props:
//   value: رشته یا عدد
//   onChange: (latinDigitString) => void
//   decimals: تعداد اعشار مجاز (پیش‌فرض ۰ = فقط عدد صحیح)
export default function FaNumberInput({ value, onChange, decimals = 0, maxLength, ...rest }) {
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

  return (
    <input
      type="text"
      inputMode={decimals && decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete="off"
      autoCorrect="off"
      spellCheck="false"
      value={value ?? ''}
      onChange={handleChange}
      {...rest}
    />
  );
}