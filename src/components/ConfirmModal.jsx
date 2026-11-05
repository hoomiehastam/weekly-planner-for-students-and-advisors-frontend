import Ico from './Ico';

// تمیز کردن ایموجی‌های رشته‌ی دکمه و تبدیل به متن خالص
function cleanEmojiText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF\u2300-\u23FF\u2B50\u2B55✓✕✗]|\u200D|\uFE0F|\uFE0E/g, '').trim();
}

// کامپوننت ConfirmModal — جایگزین window.confirm با UI زیبا
// props:
//   message: متن پیام
//   confirmText: متن دکمه‌ی تأیید (پیش‌فرض: «تأیید»)
//   cancelText: متن دکمه‌ی انصراف (پیش‌فرض: «انصراف»)
//   onConfirm: callback هنگام تأیید
//   onCancel: callback هنگام انصراف
//   danger: اگر true، دکمه‌ی تأیید قرمز باشد
export default function ConfirmModal({
  message,
  confirmText = 'تأیید',
  cancelText = 'انصراف',
  onConfirm,
  onCancel,
  danger = false,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-icon">
          <Ico e={danger ? '🗑' : '❓'} />
        </div>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button
            className={danger ? 'btn-danger-confirm' : 'btn-primary'}
            onClick={onConfirm}
          >
            {danger && <i className="ti ti-trash" aria-hidden="true" style={{ marginInlineEnd: 6 }} />}
            {cleanEmojiText(confirmText)}
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            {cleanEmojiText(cancelText)}
          </button>
        </div>
      </div>
    </div>
  );
}
