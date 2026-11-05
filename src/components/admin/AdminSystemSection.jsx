import Ico from '../Ico';
import JalaliDatePicker from '../JalaliDatePicker';
import { formatJalaliDate, toFaDigits } from '../../utils/jalali';
import { konkurCountdownText } from '../../utils/konkurDate';

export default function AdminSystemSection({
  systemCardInfo,
  setEditingCard,
  konkurDate,
  setKonkurDateDraft,
  handleSaveKonkurDate,
  initialKonkurDate,
  auditLogs,
  auditActionLabel,
}) {
  return (
    <>
      {/* کارت واریز پلتفرم — مشاوران مستقل و مؤسسه‌ها به این کارت واریز می‌کنند */}
      <section className="card admin-section">
        <h3 className="card-title">
          <span aria-hidden><Ico e="💳" /></span> کارت واریز پلتفرم
        </h3>
        <p className="muted-text" style={{ margin: '0 0 10px', fontSize: 13 }}>
          مشاوران مستقل، مدیران مؤسسه و مؤسسه‌ها برای تمدید اشتراک‌شان به این کارت واریز می‌کنند
          و رسیدشان در صفحه‌ی واریز برای شما نمایش داده می‌شود تا تأیید کنید.
        </p>
        {systemCardInfo ? (
          <div className="card-number-box" style={{ marginBottom: 10 }}>
            <div className="card-number" dir="ltr">
              {String(systemCardInfo.cardNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}
            </div>
            {systemCardInfo.holderName && <div className="card-holder">{systemCardInfo.holderName}</div>}
          </div>
        ) : (
          <div className="expired-banner warn" style={{ marginBottom: 10 }}>
            هنوز کارتی ثبت نشده — تا ثبت، مشاوران مستقل و مدیران مؤسسه صفحه‌ی واریز خالی می‌بینند.
          </div>
        )}
        <button
          className="btn-secondary btn-sm"
          onClick={() => setEditingCard({
            kind: 'SYSTEM',
            ownerId: null,
            title: 'کارت واریز پلتفرم (سوپرادمین)',
            cardNumber: systemCardInfo?.cardNumber || '',
            shaba: systemCardInfo?.shaba || '',
            holderName: systemCardInfo?.holderName || '',
            monthlyPrice: systemCardInfo?.monthlyPrice != null ? String(systemCardInfo.monthlyPrice) : '',
          })}
          type="button"
        >
          <Ico e="💳" /> {systemCardInfo ? 'ویرایش کارت پلتفرم' : 'تنظیم کارت پلتفرم'}
        </button>
      </section>

      {/* تنظیمات سراسری — تاریخ کنکور (روزشمار لندینگ) */}
      <section className="card admin-section">
        <h3 className="card-title">
          <span aria-hidden><Ico e="📅" /></span> تنظیمات سراسری
        </h3>
        <label className="field-label">
          تاریخ کنکور (روزشمار صفحه‌ی لندینگ)
          <JalaliDatePicker
            value={konkurDate}
            onChange={(v) => setKonkurDateDraft(v)}
            placeholder="تاریخ کنکور را انتخاب کنید"
          />
        </label>
        <div className="profile-form-actions" style={{ marginTop: 8 }}>
          <button
            className="btn-primary btn-sm"
            onClick={handleSaveKonkurDate}
            disabled={!konkurDate || konkurDate === initialKonkurDate}
            type="button"
          >
            <Ico e="✓" /> ذخیره‌ی تاریخ کنکور
          </button>
          {konkurDate && (
            <span className="field-hint">
              {konkurCountdownText(konkurDate) || 'این تاریخ گذشته است'} — در لندینگ همین‌طور نمایش داده می‌شود
            </span>
          )}
        </div>
      </section>

      {/* ردپای تغییرات — لاگ ممیزی آخرین اکشن‌های مدیریتی */}
      <section className="card admin-section">
        <h3 className="card-title">
          <span aria-hidden><Ico e="🧾" /></span> ردپای تغییرات ({toFaDigits(auditLogs.length)})
        </h3>
        <p className="muted-text" style={{ margin: '0 0 12px', fontSize: 13 }}>
          آخرین اکشن‌های مدیریتی با تاریخ و جزئیات — برای شفافیت و پیگیری.
        </p>
        {auditLogs.length === 0 ? (
          <p className="muted-text">هنوز اکشنی ثبت نشده.</p>
        ) : (
          <div className="audit-log-list">
            {auditLogs.map((log) => (
              <div key={log.id} className="audit-log-row">
                <span className={`audit-action audit-${log.targetType?.toLowerCase()}`}>
                  {auditActionLabel(log.action)}
                </span>
                <span className="audit-detail">
                  {log.details?.label || log.targetId}
                  {log.details?.after != null && log.details?.before != null && (
                    <small>
                      {' '}({toFaDigits(log.details.before)} ← {toFaDigits(log.details.after)})
                    </small>
                  )}
                </span>
                <span className="audit-meta">
                  {log.actorName} · {formatJalaliDate(log.createdAt, { withYear: false })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

