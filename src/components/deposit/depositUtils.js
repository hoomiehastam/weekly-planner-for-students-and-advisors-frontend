export const MAX_IMAGE_BYTES = 500 * 1024;
export const DAYS_PER_MONTH = 30;

export function formatAmount(amount) {
  if (amount == null || amount === '') return '';
  return `${Number(amount).toLocaleString('fa-IR')} تومان`;
}

// محاسبه‌ی خودکار روزهای تمدید بر اساس مبلغ واریزی و قیمت ماهانه
export function computeDaysForAmount(amount, monthlyPrice) {
  const a = Number(String(amount || '').replace(/[^\d]/g, ''));
  if (!a || !monthlyPrice || monthlyPrice <= 0) return null;
  return Math.round((a / monthlyPrice) * DAYS_PER_MONTH);
}

export function statusBadge(status) {
  switch (status) {
    case 'APPROVED': return { text: 'تأیید شد', cls: 'done' };
    case 'REJECTED': return { text: 'رد شد', cls: 'rejected' };
    default: return { text: 'در انتظار تأیید', cls: 'pending' };
  }
}

// شماره کارت با اعداد فارسی و فاصله‌گذاری چهاررقمی
export function formatCardFa(number) {
  if (!number) return '—';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(number)
    .replace(/\D/g, '')
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .replace(/\d/g, (d) => fa[Number(d)]);
}

// شماره شبا با اعداد فارسی و فاصله‌گذاری چهاررقمی
export function formatShabaFa(shaba) {
  if (!shaba) return '';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const clean = String(shaba).toUpperCase().replace(/^IR/, '');
  return 'IR ' + clean.replace(/(\d{4})(?=\d)/g, '$1 ').replace(/\d/g, (d) => fa[Number(d)]);
}

export function toEnDigits(str) {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(str).replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

// تبدیل عکس انتخاب‌شده به data URL با فشرده‌سازی ساده (مثل عکس پروفایل)
export function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressImage(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('فایل باید عکس باشد'));
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > maxBytes * 1.35 && quality > 0.4) {
        quality -= 0.15;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      if (dataUrl.length > maxBytes * 1.35) {
        reject(new Error('عکس خیلی بزرگ است؛ لطفاً عکس کوچک‌تری انتخاب کنید'));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('خواندن عکس ناموفق بود'));
    };
    img.src = objectUrl;
  });
}

export const STATUS_LABELS = {
  TRIAL: 'آزمایشی',
  ACTIVE: 'فعال',
  GRACE: 'رواداری',
  EXPIRED: 'منقضی',
};

