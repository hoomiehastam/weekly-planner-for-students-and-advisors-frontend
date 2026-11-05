import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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
import Ico from '../components/Ico';
import {
  MAX_IMAGE_BYTES,
  compressImage,
  readImageAsDataUrl,
  computeDaysForAmount,
  toEnDigits,
} from '../components/deposit/depositUtils';
import SubscriptionStatusSection from '../components/deposit/SubscriptionStatusSection';
import UserDepositSection from '../components/deposit/UserDepositSection';
import MyCardSettingsSection from '../components/deposit/MyCardSettingsSection';
import MyDepositsHistory from '../components/deposit/MyDepositsHistory';
import IncomingDepositsList from '../components/deposit/IncomingDepositsList';
import DepositDecisionModal from '../components/deposit/DepositDecisionModal';
import { toFaDigits } from '../utils/jalali';

export default function DepositPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  // اگر صفحه مستقیم (بدون تاریخچه) باز شده باشد، به پنل برمی‌گردیم نه بیرون از برنامه
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  };

  const [context, setContext] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [myDeposits, setMyDeposits] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const role = auth?.user?.role;
  const isSuperadmin = role === 'SUPERADMIN';
  const isAdvisorish = role === 'ADVISOR' || isSuperadmin || role === 'INSTITUTE_MANAGER';

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

  const payee = context?.payee;

  // پیش‌نمایش روزها در مودال تأیید (بر اساس مبلغ اصلاح‌شده و قیمت)
  const approvePrice = deciding?.deposit?.monthlyPrice ?? null;
  const approvePreviewDays = useMemo(
    () => computeDaysForAmount(approveAmount, approvePrice),
    [approveAmount, approvePrice]
  );

  async function reload() {
    setLoading(true);
    let generalErr = '';
    try {
      const [ctxRes, subRes, mineRes] = await Promise.allSettled([
        fetchDepositContext(),
        fetchMySubscription(),
        fetchMyDeposits(),
      ]);

      if (ctxRes.status === 'fulfilled') {
        setContext(ctxRes.value);
      } else {
        console.error('Failed to load deposit context:', ctxRes.reason);
        generalErr = ctxRes.reason?.message || 'بارگذاری اطلاعات مقصد پرداخت با خطا مواجه شد';
      }

      if (subRes.status === 'fulfilled') {
        setSubscription(subRes.value);
      } else {
        console.error('Failed to load subscription:', subRes.reason);
      }

      if (mineRes.status === 'fulfilled') {
        setMyDeposits(mineRes.value?.deposits || []);
      }

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
      setError(generalErr && !ctxRes.value ? generalErr : '');
    } catch (err) {
      setError(err.message || 'خطا در بارگذاری صفحه‌ی واریز');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
     
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
            <button type="button" className="deposit-back-btn" onClick={goBack} aria-label="بازگشت به پنل">
              <Ico e="→" />
              <span>بازگشت</span>
            </button>
            <div>
              <div className="greeting">{isSuperadmin ? 'رسیدهای واریز دریافتی' : 'واریز و تمدید اشتراک'}</div>
              <div className="header-date">{auth?.user?.fullName}</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-ghost header-action" onClick={goBack}>
              <span aria-hidden><Ico e="↩" /></span>
              <span className="btn-label">بازگشت</span>
            </button>
          </div>
        </div>
      </header>

      <main className="deposit-main">
        {error && <div className="alert alert-error" role="alert"><Ico e="⚠" /> {error}</div>}
        {message && <div className="alert alert-success" role="status"><Ico e="✓" /> {message}</div>}

        {/* رسیدهای دریافتی در انتظار تأیید */}
        {isAdvisorish && (
          <IncomingDepositsList
            incoming={incoming}
            onOpenApprove={openApprove}
            onReject={(d) => setDeciding({ deposit: d, mode: 'reject' })}
          />
        )}

        {/* بخش‌های مربوط به کاربر عادی / دانش‌آموز / مشاور (غیر از سوپرادمین) */}
        {!isSuperadmin && (
          <>
            <SubscriptionStatusSection subscription={subscription} />
            <UserDepositSection
              payee={payee}
              role={role}
              isInstituteAdvisor={auth?.user?.ledInstitute == null}
              receipt={receipt}
              setReceipt={setReceipt}
              amount={amount}
              setAmount={setAmount}
              note={note}
              setNote={setNote}
              submitting={submitting}
              fileInputRef={fileInputRef}
              copied={copied}
              onCopyText={copyText}
              onFileChange={handleFileChange}
              onSubmitReceipt={handleSubmitReceipt}
            />
          </>
        )}

        {/* تنظیمات شماره کارت برای مشاور / مدیر مؤسسه / سوپرادمین */}
        {isAdvisorish && (
          <MyCardSettingsSection
            isSuperadmin={isSuperadmin}
            role={role}
            myCard={myCard}
            showCardForm={showCardForm}
            setShowCardForm={setShowCardForm}
            cardForm={cardForm}
            setCardForm={setCardForm}
            onSaveCard={handleSaveCard}
          />
        )}

        {/* تاریخچه‌ی واریزهای من */}
        {!isSuperadmin && (
          <MyDepositsHistory deposits={myDeposits} />
        )}
      </main>

      {/* مودال تأیید/رد واریزی */}
      <DepositDecisionModal
        deciding={deciding}
        approveAmount={approveAmount}
        setApproveAmount={setApproveAmount}
        days={days}
        setDays={setDays}
        decisionNote={decisionNote}
        setDecisionNote={setDecisionNote}
        approvePreviewDays={approvePreviewDays}
        approvePrice={approvePrice}
        onDecide={handleDecide}
        onClose={() => setDeciding(null)}
      />
    </div>
  );
}
