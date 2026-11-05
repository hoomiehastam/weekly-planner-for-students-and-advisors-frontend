import { useCallback, useEffect, useRef } from 'react';
import { clearDraft, writeDraft } from '../utils/drafts';

// ذخیره‌ی خودکار state یک فرم در مرورگر.
//
// useDraft({ key, data, meta, dirty, enabled })
//   key:     کلید پیش‌نویس (از draftKey)؛ اگر خالی باشد هیچ کاری نمی‌کند
//   data:    مقدار فعلی فرم (باید JSON‌پذیر باشد)
//   meta:    اطلاعات کمکی (مثلاً زمان آخرین تغییر برنامه روی سرور برای تشخیص تضاد)
//   dirty:   وقتی true است ذخیره می‌شود؛ وقتی false است (فرم به حالت اولیه برگشته) پیش‌نویس پاک می‌شود
//   enabled: وقتی false است هیچ نوشتن یا پاک‌کردنی انجام نمی‌شود
//            (مثلاً تا وقتی کاربر درباره‌ی پیش‌نویسِ دارای تضاد تصمیم نگرفته)
//
// خروجی:
//   discard(): پیش‌نویس را پاک می‌کند و ذخیره‌ی بعدی را متوقف می‌کند
//              (بعد از ذخیره‌ی موفق روی سرور یا انصراف)
export function useDraft({ key, data, meta = null, dirty = true, enabled = true, delayMs = 600 }) {
  const stopped = useRef(false);
  const latest = useRef({ key, data, meta, dirty, enabled });
  useEffect(() => {
    latest.current = { key, data, meta, dirty, enabled };
  });

  // ذخیره با تأخیر کوتاه تا با هر حرف حافظه نوشته نشود
  useEffect(() => {
    if (!key || !enabled || stopped.current) return undefined;
    const t = setTimeout(() => {
      if (stopped.current) return;
      if (dirty) writeDraft(key, data, meta);
      else clearDraft(key);
    }, delayMs);
    return () => clearTimeout(t);
  }, [key, data, meta, dirty, enabled, delayMs]);

  // اگر کاربر تب را بست، رفرش کرد یا به برنامه‌ی دیگری رفت، آخرین تغییرات بلافاصله ذخیره شود
  useEffect(() => {
    function flush() {
      const { key: k, data: d, meta: m, dirty: dr, enabled: en } = latest.current;
      if (k && en && dr && !stopped.current) writeDraft(k, d, m);
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush();
    }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const discard = useCallback(() => {
    stopped.current = true;
    if (latest.current.key) clearDraft(latest.current.key);
  }, []);

  return { discard };
}
