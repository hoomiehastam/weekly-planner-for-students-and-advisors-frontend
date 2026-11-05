import { usePwa } from '../pwa/usePwa';

// وقتی نسخه‌ی جدید سایت آماده شد، این نوار بالای صفحه می‌آید.
// فعال‌شدن نسخه‌ی جدید فقط با تأیید کاربر است تا کار نیمه‌تمام (مثلاً ساخت برنامه) ناگهان قطع نشود.
// (پیش‌نویس ساخت برنامه هم به‌صورت خودکار نگه داشته می‌شود.)
export default function PwaUpdateBanner() {
  const { updateReady, applyUpdate } = usePwa();
  if (!updateReady) return null;

  return (
    <div className="pwa-update-banner" role="status" aria-live="polite">
      <span>نسخه‌ی جدید آماده است.</span>
      <button type="button" className="pwa-update-btn" onClick={applyUpdate}>
        به‌روزرسانی
      </button>
    </div>
  );
}
