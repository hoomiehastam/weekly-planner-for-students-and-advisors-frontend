import FaNumberInput from '../FaNumberInput';
import Ico from '../Ico';
import { formatCardFa, formatShabaFa } from './depositUtils';

export default function MyCardSettingsSection({
  isSuperadmin,
  role,
  myCard,
  showCardForm,
  setShowCardForm,
  cardForm,
  setCardForm,
  onSaveCard,
}) {
  if (!showCardForm) {
    return (
      <section className="deposit-panel">
        <h2>شماره کارت واریز من</h2>
        <p className="muted-text">
          {isSuperadmin
            ? 'دانش‌آموزانی که به شما به‌عنوان مشاور متصل شده‌اند، در صفحه‌ی واریز شماره کارت زیر را می‌بینند و به آن واریز می‌کنند.'
            : role === 'INSTITUTE_MANAGER'
              ? 'این شماره در صفحه‌ی واریز اعضای مؤسسه‌ی شما (دانش‌آموزان و مشاوران) نمایش داده می‌شود و تأیید رسیدها با شماست.'
              : 'اگر دانش‌آموزانت مستقیماً به تو واریز کنند، این شماره در صفحه‌ی واریز آن‌ها نمایش داده می‌شود و تأیید رسیدها با خودت است.'}
        </p>
        {myCard ? (
          <div className="bank-card bank-card-own">
            <div className="bank-card-top">
              <span className="bank-card-chip" aria-hidden />
              <span className="bank-card-kind"><Ico e="💳" /> کارت من</span>
            </div>
            <div className="bank-card-number" dir="ltr">{formatCardFa(myCard.cardNumber)}</div>
            <div className="bank-card-bottom">
              {myCard.holderName && (
                <div className="bank-card-holder">
                  <small>صاحب کارت</small>
                  <span>{myCard.holderName}</span>
                </div>
              )}
            </div>
            {myCard.shaba && (
              <div className="bank-card-shaba" dir="ltr">{formatShabaFa(myCard.shaba)}</div>
            )}
          </div>
        ) : (
          <div className="expired-banner warn">
            هنوز شماره کارتی ثبت نکرده‌اید — تا زمان ثبت، پرداخت‌کنندگان نمی‌توانند به شما واریز کنند.
          </div>
        )}
        <button
          className="btn-ghost"
          style={{ marginTop: 10 }}
          onClick={() => {
            setCardForm({
              cardNumber: myCard?.cardNumber || '',
              shaba: myCard?.shaba || '',
              holderName: myCard?.holderName || '',
            });
            setShowCardForm(true);
          }}
        >
          {myCard ? 'ویرایش شماره کارت' : 'ثبت شماره کارت'}
        </button>
      </section>
    );
  }

  return (
    <section className="deposit-panel">
      <h2>ثبت شماره کارت</h2>
      <form onSubmit={onSaveCard} className="deposit-form">
        <label className="field-label">
          شماره کارت (۱۶ رقم)
          <FaNumberInput
            value={cardForm.cardNumber}
            onChange={(v) => setCardForm((f) => ({ ...f, cardNumber: v }))}
            placeholder="۱۲۳۴ ۵۶۷۸ ۹۰۱۲ ۳۴۵۶"
            maxLength={19}
            required
          />
        </label>
        <label className="field-label">
          نام صاحب کارت (اختیاری)
          <input
            type="text"
            value={cardForm.holderName}
            onChange={(e) => setCardForm((f) => ({ ...f, holderName: e.target.value }))}
          />
        </label>
        <label className="field-label">
          شماره شبا (اختیاری)
          <input
            type="text"
            dir="ltr"
            value={cardForm.shaba}
            onChange={(e) => setCardForm((f) => ({ ...f, shaba: e.target.value }))}
            placeholder="IR"
          />
        </label>
        <div className="deposit-actions">
          <button type="submit" className="btn-primary">ذخیره</button>
          <button type="button" className="btn-secondary" onClick={() => setShowCardForm(false)}>انصراف</button>
        </div>
      </form>
    </section>
  );
}

