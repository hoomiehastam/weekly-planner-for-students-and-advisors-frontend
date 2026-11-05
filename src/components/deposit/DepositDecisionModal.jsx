import FaNumberInput from '../FaNumberInput';
import Ico from '../Ico';
import { toFaDigits } from '../../utils/jalali';

export default function DepositDecisionModal({
  deciding,
  approveAmount,
  setApproveAmount,
  days,
  setDays,
  decisionNote,
  setDecisionNote,
  approvePreviewDays,
  approvePrice,
  onDecide,
  onClose,
}) {
  if (!deciding) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="profile-modal-head">
          <h3>
            {deciding.mode === 'approve'
              ? `تأیید رسید ${deciding.deposit.payerName || ''}`
              : `رد رسید ${deciding.deposit.payerName || ''}`}
          </h3>
          <button className="btn-icon-only" onClick={onClose} aria-label="بستن"><Ico e="✕" /></button>
        </div>
        <div className="profile-form">
          <img src={deciding.deposit.receiptImageUrl} alt="رسید" className="receipt-full" />
          <div className="muted-text">
            مقصد تمدید: {deciding.deposit.targetTitle}
          </div>
          {deciding.mode === 'approve' && (
            <>
              <label className="field-label">
                مبلغ واریزی (تومان) — قابل اصلاح
                <FaNumberInput
                  value={approveAmount}
                  onChange={setApproveAmount}
                  placeholder="مثلاً ۵۰۰٬۰۰۰"
                  grouping
                  autoFocus
                />
                <span className="field-hint">
                  اگر پرداخت‌کننده مبلغ اشتباهی وارد کرده، همین‌جا اصلاحش کن
                  {approvePrice != null ? ` — اشتراک ماهانه ${Number(approvePrice).toLocaleString('fa-IR')} تومان` : ''}
                </span>
              </label>
              {approvePreviewDays != null ? (
                <div className="auto-days-box">
                  <span aria-hidden><Ico e="🧮" /></span>
                  تمدید خودکار: <strong>{toFaDigits(approvePreviewDays)} روز</strong>
                  <span className="field-hint">بر اساس مبلغ ÷ قیمت ماهانه × ۳۰ روز</span>
                </div>
              ) : (
                <label className="field-label">
                  مدت تمدید (روز)
                  <FaNumberInput
                    value={days}
                    onChange={setDays}
                    placeholder="مثلاً ۳۰"
                  />
                  <span className="field-hint">
                    قیمت ماهانه‌ای ثبت نشده؛ مدت را دستی وارد کن. مثلاً ۳۰ = یک ماه
                  </span>
                </label>
              )}
            </>
          )}
          <label className="field-label">
            توضیح {deciding.mode === 'reject' ? 'دلیل رد' : '(اختیاری)'}
            <input
              type="text"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              maxLength={300}
            />
          </label>
          <div className="deposit-actions profile-form-actions">
            <button className="btn-primary" onClick={onDecide}>
              {deciding.mode === 'approve'
                ? approvePreviewDays != null
                  ? `تأیید و تمدید ${toFaDigits(approvePreviewDays)} روزه`
                  : 'تأیید و تمدید اشتراک'
                : 'رد رسید'}
            </button>
            <button className="btn-secondary" onClick={onClose}>انصراف</button>
          </div>
        </div>
      </div>
    </div>
  );
}

