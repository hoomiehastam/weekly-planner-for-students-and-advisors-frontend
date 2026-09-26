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
          {danger ? '🗑' : '❓'}
        </div>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button
            className={danger ? 'btn-danger-confirm' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
