// ابزار کمکِ اشتراک‌گذاری لینک دعوت: ساخت آدرس کامل، کپی و اشتراک‌گذاری بومی گوشی

export function fullUrl(path) {
  if (!path) return '';
  return `${window.location.origin}${path}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // مرورگر قدیمی/بدون دسترسی — راه جایگزین
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function canNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function nativeShare({ title, text, url }) {
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    return false; // کاربر بست یا پشتیبانی نمی‌شود
  }
}
