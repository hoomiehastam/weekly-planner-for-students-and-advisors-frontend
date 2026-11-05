// بنر اطلاع‌رسانی درباره‌ی پیش‌نویس ذخیره‌نشده‌ی یک فرم
// variant:
//   'restored' — پیش‌نویس بازگردانده شد؛ کاربر می‌تواند «شروع از اول» را بزند
//   'conflict' — موردِ ویرایش‌شده بعد از ذخیره‌ی پیش‌نویس روی سرور تغییر کرده؛ کاربر باید انتخاب کند
function formatSavedAt(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('fa-IR', {
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function DraftNotice({ variant, savedAt, extra, onReset, onRestore, onDelete }) {
  const when = formatSavedAt(savedAt);

  if (variant === 'conflict') {
    return (
      <div className="draft-notice is-warning" role="alert">
        <p>
          پیش‌نویسی از تغییرات قبلی‌ات{when ? ` (${when})` : ''} هست، اما این مورد بعد از آن روی سرور تغییر کرده است.
          اگر پیش‌نویس را بازگردانی کنی، تغییرات تازه‌ی سرور با آن جایگزین می‌شود.
          تا تصمیم نگیری، ذخیره‌ی خودکار متوقف است.
        </p>
        <div className="draft-notice-actions">
          <button type="button" className="btn-secondary" onClick={onRestore}>بازگردانی پیش‌نویس</button>
          <button type="button" className="btn-secondary" onClick={onDelete}>حذف پیش‌نویس</button>
        </div>
      </div>
    );
  }

  return (
    <div className="draft-notice" role="status">
      <p>
        پیش‌نویس ذخیره‌نشده‌ات{when ? ` (${when})` : ''} بازگردانده شد.
        {extra ? ` ${extra}` : ''}
      </p>
      <div className="draft-notice-actions">
        <button type="button" className="btn-secondary" onClick={onReset}>شروع از اول</button>
      </div>
    </div>
  );
}
