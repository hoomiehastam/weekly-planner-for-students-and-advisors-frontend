import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatJalaliDate, toFaDigits } from '../utils/jalali';
import {
  fetchDepositContext,
  fetchMySubscription,
  fetchMyCard,
  fetchMyDeposits,
  fetchIncomingDeposits,
  createDeposit,
  approveDeposit,
  rejectDeposit,
  setMyCardSettings,
} from '../api/client';
import FaNumberInput from '../components/FaNumberInput';

// ====== ابزارها ======
const MAX_IMAGE_BYTES = 500 * 1024;
const DAYS_PER_MONTH = 30;

function formatAmount(amount) {
  if (amount == null || amount === '') return '';
  return `${Number(amount).toLocaleString('fa-IR')} تومان`;
}

// محاسبه‌ی خودکار روزهای تمدید بر اساس مبلغ واریزی و قیمت ماهانه
function computeDaysForAmount(amount, monthlyPrice) {
  const a = Number(String(amount || '').replace(/[^\d]/g, ''));
  if (!a || !monthlyPrice || monthlyPrice <= 0) return null;
  return Math.round((a / monthlyPrice) * DAYS_PER_MONTH);
}

function statusBadge(status) {
  switch (status) {
    case 'APPROVED': return { text: 'تأیید شد', cls: 'done' };
    case 'REJECTED': return { text: 'رد شد', cls: 'rejected' };
    default: return { text: 'در انتظار تأیید', cls: 'pending' };
  }
}

// شماره کارت با اعداد فارسی و فاصله‌گذاری چهاررقمی
function formatCardFa(number) {
  if (!number) return '—';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(number)
    .replace(/\D/g, '')
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .replace(/\d/g, (d) => fa[Number(d)]);
}

// شماره شبا با اعداد فارسی و فاصله‌گذاری چهاررقمی
function formatShabaFa(shaba) {
  if (!shaba) return '';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const clean = String(shaba).toUpperCase().replace(/^IR/, '');
  return 'IR ' + clean.replace(/(\d{4})(?=\d)/g, '$1 ').replace(/\d/g, (d) => fa[Number(d)]);
}

function toEnDigits(str) {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(str).replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

// تبدیل عکس انتخاب‌شده به data URL با فشرده‌سازی ساده (مثل عکس پروفایل)
function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('فایل باید عکس باشد'));
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > maxBytes * 1.35 && quality > 0.4) {
        quality -= 0.15;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      if (dataUrl.length > maxBytes * 1.35) {
        reject(new Error('عکس خیلی بزرگ است؛ لطفاً عکس کوچک‌تری انتخاب کنید'));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('خواندن عکس ناموفق بود'));
    };
    img.src = objectUrl;
  });
}

const STATUS_LABELS = {
  TRIAL: 'آزمایشی',
  ACTIVE: 'فعال',
  GRACE: 'رواداری',
  EXPIRED: 'منقضی',
};

function SubscriptionChip({ sub, label }) {
  if (!sub) return null;
  // مقایسه‌ی زنده‌ی تاریخ با «الان» عمداً در رندر انجام می‌شود تا انقضا بلافاصله دیده شود
  // eslint-disable-next-line react-hooks/purity
  const expired = sub.status === 'EXPIRED' || new Date(sub.endsAt).getTime() < Date.now();
  return (
    <div className={`subscription-chip ${expired ? 'expired' : 'ok'}`}>
      <span className="chip-label">{label}:</span>
      <span>{STATUS_LABELS[sub.status] || sub.status}</span>
      <span className="chip-date">تا {formatJalaliDate(sub.endsAt, { withYear: true })}</span>
    </div>
  );
}

export default function DepositPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [context, setContext] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [myDeposits, setMyDeposits] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const role = auth?.user?.role;
  const isSuperadmin = role === 'SUPERADMIN';

  // فرم ثبت رسید
  const [receipt, setReceipt] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [copied, setCopied] = useState(''); // 'card' | 'shaba' — بازخورد کپی

  // فرم تأیید (مودال ساده با days)
  const [deciding, setDeciding] = useState(null); // { deposit, mode: 'approve'|'reject' }
  const [approveAmount, setApproveAmount] = useState(''); // مبلغ (قابل اصلاح توسط تأییدکننده)
  const [days, setDays] = useState('30');
  const [decisionNote, setDecisionNote] = useState('');

  // فرم کارت مشاور/مدیر/سوپرادمین
  const [cardForm, setCardForm] = useState({ cardNumber: '', shaba: '', holderName: '' });
  const [showCardForm, setShowCardForm] = useState(false);
  const [myCard, setMyCard] = useState(null);

  const isAdvisorish = role === 'ADVISOR' || isSuperadmin || role === 'INSTITUTE_MANAGER';

  const payee = context?.payee;
  const access = subscription?.access;

  // قیمت ماهانه‌ی مرتبط با مقصد پرداخت — از deposit-context می‌آید
  const monthlyPrice = payee?.monthlyPrice ?? null;

  // پیش‌نمایش خودکار روزهای تمدید بر اساس مبلغ واردشده
  const previewDays = useMemo(() => computeDaysForAmount(amount, monthlyPrice), [amount, monthlyPrice]);

  // پیش‌نمایش روزها در مودال تأیید (بر اساس مبلغ اصلاح‌شده و قیمت)
  const approvePrice = deciding?.deposit?.monthlyPrice ?? null;
  const approvePreviewDays = useMemo(
    () => computeDaysForAmount(approveAmount, approvePrice),
    [approveAmount, approvePrice]
  );

  async function reload() {
    try {
      const [ctx, sub, mine] = await Promise.all([
        fetchDepositContext(),
        fetchMySubscription(),
        fetchMyDeposits(),
      ]);
      setContext(ctx);
      setSubscription(sub);
      setMyDeposits(mine.deposits || []);
      if (isAdvisorish) {
        try {
          const c = await fetchMyCard();
          setMyCard(c.card || null);
        } catch {
          setMyCard(null);
        }
        try {
          const inc = await fetchIncomingDeposits();
          setIncoming(inc.deposits || []);
        } catch {
          setIncoming([]);
        }
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      let dataUrl;
      try {
        dataUrl = await compressImage(file, MAX_IMAGE_BYTES);
      } catch {
        dataUrl = await readImageAsDataUrl(file);
        if (dataUrl.length > MAX_IMAGE_BYTES * 1.35) {
          throw new Error('عکس خیلی بزرگ است؛ حداکثر ۵۰۰ کیلوبایت');
        }
      }
      setReceipt(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmitReceipt(e) {
    e.preventDefault();
    if (!context?.payee?.card) {
      setError('هنوز شماره کارتی برای شما تعریف نشده؛ با پشتیبانی تماس بگیرید');
      return;
    }
    // مبلغ الزامی است — مبنای محاسبه‌ی خودکار روزهای تمدید است
    const numericAmount = Number(String(amount).replace(/[^\d]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      setError('لطفاً مبلغ واریزی را وارد کنید');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createDeposit({
        targetKind: context.payee.targetKind,
        targetId: context.payee.targetId,
        receiptImageUrl: receipt,
        amount: numericAmount,
        note: note || undefined,
      });
      setReceipt('');
      setAmount('');
      setNote('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('رسید شما ثبت شد و در انتظار تأیید است');
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openApprove(deposit) {
    setDeciding({ deposit, mode: 'approve' });
    setApproveAmount(deposit.amount != null ? String(deposit.amount) : '');
    setDays('30');
    setDecisionNote('');
  }

  async function handleDecide() {
    if (!deciding) return;
    try {
      if (deciding.mode === 'approve') {
        // مبلغ اصلاح‌شده را می‌فرستیم — بک‌اند روزها را از مبلغ ÷ قیمت ماهانه حساب می‌کند؛
        // اگر قیمت ثبت نشده باشد، days دستی لازم است.
        const correctedAmount = approveAmount
          ? Number(String(approveAmount).replace(/[^\d]/g, ''))
          : undefined;
        let finalDays;
        if (approvePreviewDays) {
          finalDays = approvePreviewDays;
        } else {
          const d = Number(String(days).replace(/[^\d]/g, ''));
          if (!Number.isInteger(d) || d < 1) {
            setError('مدت تمدید باید عدد صحیح و حداقل ۱ روز باشد');
            return;
          }
          finalDays = d;
        }
        await approveDeposit(deciding.deposit.id, finalDays, decisionNote || undefined, correctedAmount);
        setMessage(`رسید تأیید شد و اشتراک ${toFaDigits(finalDays)} روز تمدید شد`);
      } else {
        await rejectDeposit(deciding.deposit.id, decisionNote || undefined);
        setMessage('رسید رد شد');
      }
      setDeciding(null);
      setDecisionNote('');
      setDays('30');
      setApproveAmount('');
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveCard(e) {
    e.preventDefault();
    setError('');
    try {
      await setMyCardSettings({
        cardNumber: cardForm.cardNumber,
        shaba: cardForm.shaba || undefined,
        holderName: cardForm.holderName || undefined,
      });
      setMessage(
        role === 'INSTITUTE_MANAGER'
          ? 'شماره کارت ذخیره شد؛ اعضای مؤسسه‌ی شما از این پس به این کارت واریز می‌کنند'
          : 'شماره کارت ذخیره شد؛ دانش‌آموزانت از این پس به این کارت واریز می‌کنند'
      );
      setShowCardForm(false);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyText(text, which) {
    try {
      await navigator.clipboard.writeText(toEnDigits(text).replace(/\s/g, ''));
      setCopied(which);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      // کپی ناموفق — بی‌صدا رد می‌شود
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>در حال بارگذاری صفحه‌ی واریز…</p>
      </div>
    );
  }

  return (
    <div className="deposit-page">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div>
              <div className="greeting">{isSuperadmin ? 'رسیدهای واریز دریافتی' : 'واریز و تمدید اشتراک'}</div>
              <div className="header-date">{auth?.user?.fullName}</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-ghost header-action" onClick={() => navigate(-1)}>
              <span aria-hidden>↩</span>
              <span className="btn-label">بازگشت</span>
            </button>
          </div>
        </div>
      </header>

      <main className="deposit-main">
        {error && <div className="alert alert-error" role="alert">⚠️ {error}</div>}
        {message && <div className="alert alert-success" role="status">✓ {message}</div>}

        {/* --- ورودی‌های در انتظار تأیید (مشاور/مدیر/سوپرادمین) --- */}
        {isAdvisorish && incoming.length > 0 && (
          <section className="deposit-panel">
            <h2>رسیدهای در انتظار تأیید شما ({toFaDigits(incoming.filter((d) => d.status === 'PENDING').length)})</h2>
            <div className="deposit-list">
              {incoming.map((d) => {
                const badge = statusBadge(d.status);
                return (
                  <div key={d.id} className={`deposit-item status-${d.status.toLowerCase()}`}>
                    <img src={d.receiptImageUrl} alt={`رسید ${d.payerName || ''}`} className="deposit-thumb" />
                    <div className="deposit-info">
                      <div className="deposit-payer">{d.payerName} <span className="muted-text">→ {d.targetTitle}</span></div>
                      {d.amount != null && <div className="muted-text">مبلغ: {formatAmount(d.amount)}</div>}
                      {d.note && <div className="muted-text">{d.note}</div>}
                      <div className="muted-text">{formatJalaliDate(d.createdAt, { withYear: true })}</div>
                      <span className={`status-pill ${badge.cls}`}>{badge.text}</span>
                      {d.status === 'APPROVED' && d.approvedDays && (
                        <span className="muted-text"> +{toFaDigits(d.approvedDays)} روز → {formatJalaliDate(d.newEndsAt, { withYear: true })}</span>
                      )}
                      {d.status === 'REJECTED' && d.decisionNote && <div className="muted-text">دلیل: {d.decisionNote}</div>}
                    </div>
                    {d.status === 'PENDING' && (
                      <div className="deposit-actions">
                        <button className="btn-primary" onClick={() => openApprove(d)}>تأیید و تمدید</button>
                        <button className="btn-danger" onClick={() => setDeciding({ deposit: d, mode: 'reject' })}>رد</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {isAdvisorish && incoming.length === 0 && (
          <section className="deposit-panel">
            <h2>رسیدهای دریافتی</h2>
            <p className="muted-text">فعلاً رسیدی برای تأیید نیامده است.</p>
          </section>
        )}

        {/* ====== بخش‌های زیر فقط برای غیرسوپرادمین‌ها ======
            سوپرادمین اشتراک/پرداخت ندارد — فقط رسیدها و کارتش را می‌بیند */}
        {!isSuperadmin && (
          <>
            {/* --- وضعیت اشتراک --- */}
            <section className="deposit-panel deposit-status">
              <h2>وضعیت اشتراک من</h2>
              {access && !access.hasAccess && (
                <div className="expired-banner">
                  ⛔ اشتراک شما منقضی شده است. برای بازگشایی دسترسی، واریز کنید تا رسید شما تأیید شود.
                </div>
              )}
              {subscription?.subscription && (
                <SubscriptionChip sub={subscription.subscription} label="اشتراک فردی" />
              )}
              {subscription?.instituteSubscription && (
                <SubscriptionChip
                  sub={subscription.instituteSubscription}
                  label={`اشتراک مؤسسه (${subscription.instituteSubscription.instituteName || ''})`}
                />
              )}
              {!subscription?.subscription && !subscription?.instituteSubscription && (
                <p className="muted-text">رکورد اشتراکی ثبت نشده است.</p>
              )}
            </section>

            {/* --- کارت مقصد واریز --- */}
            {payee && (
              <section className="deposit-panel">
                <h2>{payee.title}</h2>
                {payee.card ? (
                  <>
                    <div className="bank-card">
                      <div className="bank-card-top">
                        <span className="bank-card-chip" aria-hidden />
                        <span className="bank-card-kind">💳 کارت بانکی</span>
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
                          <button type="button" className="bank-card-copy" onClick={() => copyText(payee.card.shaba, 'shaba')}>
                            {copied === 'shaba' ? '✓ کپی شد' : 'کپی شبا'}
                          </button>
                        )}
                      </div>
                      {payee.card.shaba && (
                        <div className="bank-card-shaba" dir="ltr">{formatShabaFa(payee.card.shaba)}</div>
                      )}
                      <button
                        type="button"
                        className={`bank-card-copy bank-card-copy-main ${copied === 'card' ? 'copied' : ''}`}
                        onClick={() => copyText(payee.card.cardNumber, 'card')}
                      >
                        {copied === 'card' ? '✓ شماره کارت کپی شد' : '📋 کپی شماره کارت'}
                      </button>
                    </div>
                    {/* مبلغ ماهانه — اگر سوپرادمین تعیین کرده باشد */}
                    {monthlyPrice != null && (
                      <div className="monthly-price-box">
                        <span className="monthly-price-label">💰 مبلغ اشتراک ماهانه:</span>
                        <strong>{Number(monthlyPrice).toLocaleString('fa-IR')} تومان</strong>
                      </div>
                    )}
                    <div className="deposit-target-hint">
                      <span aria-hidden>🎯</span> مقصد تمدید: <strong>{payee.targetTitle}</strong> — بعد از واریز، مبلغ و عکس رسید را ثبت کنید تا تمدید شود.
                    </div>
                  </>
                ) : (
                  <div className="expired-banner warn">
                    هنوز شماره کارتی برای این بخش ثبت نشده است. لطفاً با گیرنده‌ی پرداخت هماهنگ کنید.
                  </div>
                )}

                {/* فرم ارسال رسید */}
                {payee.card && (
                  <form onSubmit={handleSubmitReceipt} className="deposit-form">
                    {!receipt ? (
                      <label className="receipt-dropzone">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          hidden
                        />
                        <span className="dropzone-emoji" aria-hidden>🧾</span>
                        <strong>انتخاب عکس رسید</strong>
                        <small>عکس رسید واریز را انتخاب کنید — JPG یا PNG، حداکثر ۵۰۰ کیلوبایت</small>
                        <span className="dropzone-hint">مرحله‌ی بعد: تایید توسط گیرنده و تمدید خودکار اشتراک</span>
                      </label>
                    ) : (
                      <div className="receipt-preview">
                        <img src={receipt} alt="پیش‌نمایش رسید" />
                        <div className="receipt-preview-actions">
                          <button type="button" className="btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                            🔄 تغییر عکس
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm btn-danger"
                            onClick={() => {
                              setReceipt('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            🗑 حذف
                          </button>
                        </div>
                      </div>
                    )}
                    <label className="field-label">
                      مبلغ واریزی (تومان){monthlyPrice != null ? '' : ' — اختیاری'}
                      <FaNumberInput
                        value={amount}
                        onChange={setAmount}
                        placeholder="مثلاً ۵۰۰۰۰۰"
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
            )}

            {/* --- مشاور آموزشگاهی: نیازی به واریز ندارد --- */}
            {!payee && role === 'ADVISOR' && auth?.user?.ledInstitute == null && (
              <section className="deposit-panel">
                <h2>تمدید اشتراک</h2>
                <div className="deposit-target-hint">
                  <span aria-hidden>🏫</span>
                  شما مشاورِ مؤسسه هستید؛ اشتراک شما با اشتراک مؤسسه‌تان فعال می‌ماند و نیازی به پرداخت جداگانه ندارید.
                  اگر اشتراک مؤسسه به مشکل خورد، با نماینده یا مدیر مؤسسه هماهنگ کنید.
                </div>
              </section>
            )}
          </>
        )}

        {/* --- شماره کارت واریز من (مشاور مستقل / مدیر مؤسسه / سوپرادمین) --- */}
        {isAdvisorish && !showCardForm && (
          <section className="deposit-panel">
            <h2>شماره کارت واریز من</h2>
            <p className="muted-text">
              {isSuperadmin
                ? 'دانش‌آموزانی که شما مشاورشان هستید به این کارت واریز می‌کنند. کارت پلتفرم (برای مشاوران مستقل و مدیران مؤسسه) را از پنل مدیریت تنظیم کنید.'
                : role === 'INSTITUTE_MANAGER'
                  ? 'این شماره در صفحه‌ی واریز اعضای مؤسسه‌ی شما (دانش‌آموزان و مشاوران) نمایش داده می‌شود و تأیید رسیدها با شماست.'
                  : 'اگر دانش‌آموزانت مستقیماً به تو واریز کنند، این شماره در صفحه‌ی واریز آن‌ها نمایش داده می‌شود و تأیید رسیدها با خودت است.'}
            </p>
            {myCard ? (
              <div className="bank-card bank-card-own">
                <div className="bank-card-top">
                  <span className="bank-card-chip" aria-hidden />
                  <span className="bank-card-kind">💳 کارت من</span>
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
            <button className="btn-ghost" style={{ marginTop: 10 }} onClick={() => {
              setCardForm({
                cardNumber: myCard?.cardNumber || '',
                shaba: myCard?.shaba || '',
                holderName: myCard?.holderName || '',
              });
              setShowCardForm(true);
            }}>
              {myCard ? 'ویرایش شماره کارت' : 'ثبت شماره کارت'}
            </button>
          </section>
        )}
        {isAdvisorish && showCardForm && (
          <section className="deposit-panel">
            <h2>ثبت شماره کارت</h2>
            <form onSubmit={handleSaveCard} className="deposit-form">
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
        )}

        {/* --- تاریخچه‌ی رسیدهای من --- */}
        {!isSuperadmin && myDeposits.length > 0 && (
          <section className="deposit-panel">
            <h2>رسیدهای من</h2>
            <div className="deposit-list">
              {myDeposits.map((d) => {
                const badge = statusBadge(d.status);
                return (
                  <div key={d.id} className={`deposit-item status-${d.status.toLowerCase()}`}>
                    <img src={d.receiptImageUrl} alt="رسید" className="deposit-thumb" />
                    <div className="deposit-info">
                      <div className="muted-text">مقصد: {d.targetTitle}</div>
                      {d.amount != null && <div className="muted-text">مبلغ: {formatAmount(d.amount)}</div>}
                      <div className="muted-text">{formatJalaliDate(d.createdAt, { withYear: true })}</div>
                      <span className={`status-pill ${badge.cls}`}>{badge.text}</span>
                      {d.status === 'APPROVED' && d.approvedDays && (
                        <span className="muted-text"> تمدید {toFaDigits(d.approvedDays)} روزه تا {formatJalaliDate(d.newEndsAt, { withYear: true })}</span>
                      )}
                      {d.status === 'REJECTED' && d.decisionNote && <div className="muted-text">دلیل رد: {d.decisionNote}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* --- مودال تأیید/رد --- */}
      {deciding && (
        <div className="modal-overlay" onClick={() => setDeciding(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="profile-modal-head">
              <h3>
                {deciding.mode === 'approve'
                  ? `تأیید رسید ${deciding.deposit.payerName || ''}`
                  : `رد رسید ${deciding.deposit.payerName || ''}`}
              </h3>
              <button className="btn-icon-only" onClick={() => setDeciding(null)} aria-label="بستن">✕</button>
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
                      placeholder="مثلاً ۵۰۰۰۰۰"
                      autoFocus
                    />
                    <span className="field-hint">
                      اگر پرداخت‌کننده مبلغ اشتباهی وارد کرده، همین‌جا اصلاحش کن
                      {approvePrice != null ? ` — اشتراک ماهانه ${Number(approvePrice).toLocaleString('fa-IR')} تومان` : ''}
                    </span>
                  </label>
                  {approvePreviewDays != null ? (
                    <div className="auto-days-box">
                      <span aria-hidden>🧮</span>
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
                <button className="btn-primary" onClick={handleDecide}>
                  {deciding.mode === 'approve'
                    ? approvePreviewDays != null
                      ? `تأیید و تمدید ${toFaDigits(approvePreviewDays)} روزه`
                      : 'تأیید و تمدید اشتراک'
                    : 'رد رسید'}
                </button>
                <button className="btn-secondary" onClick={() => setDeciding(null)}>انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
