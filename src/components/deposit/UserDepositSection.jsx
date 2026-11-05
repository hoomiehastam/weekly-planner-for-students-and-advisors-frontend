import { useMemo } from 'react';
import FaNumberInput from '../FaNumberInput';
import Ico from '../Ico';
import {
  computeDaysForAmount,
  formatCardFa,
  formatShabaFa,
} from './depositUtils';
import { toFaDigits } from '../../utils/jalali';

export default function UserDepositSection({
  payee,
  role,
  isInstituteAdvisor,
  receipt,
  setReceipt,
  amount,
  setAmount,
  note,
  setNote,
  submitting,
  fileInputRef,
  copied,
  onCopyText,
  onFileChange,
  onSubmitReceipt,
}) {
  const discountPercent = payee?.discountPercent || 0;
  const baseMonthlyPrice = payee?.monthlyPrice ?? null;
  const monthlyPrice = discountPercent > 0 && payee?.monthlyPriceAfterDiscount != null
    ? payee.monthlyPriceAfterDiscount
    : baseMonthlyPrice;

  const previewDays = useMemo(() => computeDaysForAmount(amount, monthlyPrice), [amount, monthlyPrice]);

  if (!payee) {
    if (role === 'ADVISOR' && isInstituteAdvisor) {
      return (
        <section className="deposit-panel">
          <h2>تمدید اشتراک</h2>
          <div className="deposit-target-hint">
            <span aria-hidden><Ico e="🏫" /></span>
            شما مشاورِ مؤسسه هستید؛ اشتراک شما با اشتراک مؤسسه‌تان فعال می‌ماند و نیازی به پرداخت جداگانه ندارید.
            اگر اشتراک مؤسسه به مشکل خورد، با نماینده یا مدیر مؤسسه هماهنگ کنید.
          </div>
        </section>
      );
    }

    if (role !== 'ADVISOR') {
      return (
        <section className="deposit-panel">
          <h2>اطلاعات واریز و تمدید اشتراک</h2>
          <div className="deposit-target-hint">
            <span aria-hidden><Ico e="💡" /></span>
            هنوز شماره کارتی برای تمدید حساب شما تنظیم نشده است. اگر دانش‌آموز هستید، مطمئن شوید به مشاور متصل شده‌اید، یا با مشاور یا پشتیبانی تماس بگیرید.
          </div>
        </section>
      );
    }

    return null;
  }

  return (
    <section className="deposit-panel">
      <h2>{payee.title}</h2>
      {payee.card ? (
        <>
          <div className="bank-card">
            <div className="bank-card-top">
              <span className="bank-card-chip" aria-hidden />
              <span className="bank-card-kind"><Ico e="💳" /> کارت بانکی</span>
            </div>
            <div className="bank-card-number" dir="ltr">{formatCardFa(payee.card.cardNumber)}</div>
            <div className="bank-card-bottom">
              {payee.card.holderName && (
                <div className="bank-card-holder">
                  <small>صاحب کارت</small>
                  <span>{payee.card.holderName}</span>
                </div>
              )}
              {payee.card.shaba && (
                <button type="button" className="bank-card-copy" onClick={() => onCopyText(payee.card.shaba, 'shaba')}>
                  {copied === 'shaba' ? <><Ico e="✓" /> کپی شد</> : 'کپی شبا'}
                </button>
              )}
            </div>
            {payee.card.shaba && (
              <div className="bank-card-shaba" dir="ltr">{formatShabaFa(payee.card.shaba)}</div>
            )}
            <button
              type="button"
              className={`bank-card-copy bank-card-copy-main ${copied === 'card' ? 'copied' : ''}`}
              onClick={() => onCopyText(payee.card.cardNumber, 'card')}
            >
              {copied === 'card' ? <><Ico e="✓" /> شماره کارت کپی شد</> : <><Ico e="📋" /> کپی شماره کارت</>}
            </button>
          </div>
          {/* مبلغ ماهانه — اگر سوپرادمین تعیین کرده باشد */}
          {monthlyPrice != null && (
            <div className="monthly-price-box">
              <span className="monthly-price-label"><Ico e="💰" /> مبلغ اشتراک ماهانه:</span>
              {discountPercent > 0 && (
                <s className="monthly-price-old">{Number(baseMonthlyPrice).toLocaleString('fa-IR')}</s>
              )}
              <strong>{Number(monthlyPrice).toLocaleString('fa-IR')} تومان</strong>
              {discountPercent > 0 && (
                <span className="discount-chip"><Ico e="🎁" /> {toFaDigits(discountPercent)}٪ تخفیف دعوت</span>
              )}
            </div>
          )}
          <div className="deposit-target-hint">
            <span aria-hidden><Ico e="🎯" /></span> مقصد تمدید: <strong>{payee.targetTitle}</strong> — بعد از واریز، مبلغ و عکس رسید را ثبت کنید تا تمدید شود.
          </div>
        </>
      ) : (
        <div className="expired-banner warn">
          هنوز شماره کارتی برای این بخش ثبت نشده است. لطفاً با گیرنده‌ی پرداخت هماهنگ کنید.
        </div>
      )}

      {/* فرم ارسال رسید */}
      {payee.card && (
        <form onSubmit={onSubmitReceipt} className="deposit-form">
          {!receipt ? (
            <label className="receipt-dropzone">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                hidden
              />
              <span className="dropzone-emoji" aria-hidden><Ico e="🧾" /></span>
              <strong>انتخاب عکس رسید</strong>
              <small>عکس رسید واریز را انتخاب کنید — JPG یا PNG، حداکثر ۵۰۰ کیلوبایت</small>
              <span className="dropzone-hint">مرحله‌ی بعد: تایید توسط گیرنده و تمدید خودکار اشتراک</span>
            </label>
          ) : (
            <div className="receipt-preview">
              <img src={receipt} alt="پیش‌نمایش رسید" />
              <div className="receipt-preview-actions">
                <button type="button" className="btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                  <Ico e="🔄" /> تغییر عکس
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm btn-danger"
                  onClick={() => {
                    setReceipt('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <Ico e="🗑" /> حذف
                </button>
              </div>
            </div>
          )}
          <label className="field-label">
            مبلغ واریزی (تومان){monthlyPrice != null ? '' : ' — اختیاری'}
            <FaNumberInput
              value={amount}
              onChange={setAmount}
              placeholder="مثلاً ۵۰۰٬۰۰۰"
              grouping
              required={monthlyPrice != null}
            />
            {monthlyPrice != null && (
              <span className="field-hint">
                اشتراک ماهانه {Number(monthlyPrice).toLocaleString('fa-IR')} تومان است
                {previewDays ? ` — این مبلغ ${toFaDigits(previewDays)} روز تمدید می‌دهد` : ''}
              </span>
            )}
          </label>
          <label className="field-label">
            توضیح (اختیاری)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="مثلاً: تمدید ماهانه"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting || !receipt}>
            {submitting ? 'در حال ارسال…' : 'ارسال رسید'}
          </button>
        </form>
      )}
    </section>
  );
}

