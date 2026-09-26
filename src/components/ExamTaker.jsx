import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startExam, saveExamAnswer, submitExam } from '../api/client';
import { useToast } from '../context/ToastContext';
import { toFaDigits } from '../utils/jalali';
import ConfirmModal from './ConfirmModal';

// فرمت «mm:ss» یا «hh:mm:ss» با ارقام فارسی
function formatCountdown(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const str = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return toFaDigits(str);
}

// کامپوننت شرکت در آزمون برای دانش‌آموز.
// شامل: شمارش معکوس همگام با ساعت سرور، ذخیره‌ی خودکار با debounce،
// ارسال خودکار در پایان مهلت، ناوبری سؤال‌ها و نوار پیشرفت.
// props:
//   exam     آزمون (از fetchMyExams)
//   onClose  callback بستن
//   onReview(examId) — باز کردن مودال مرور پاسخ‌ها پس از ارسال (اختیاری)
export default function ExamTaker({ exam, onClose, onReview }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [fullExam, setFullExam] = useState(null);
  const [answers, setAnswers] = useState({}); // { [questionId]: { selectedOption?, textAnswer? } }
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showFinalCall, setShowFinalCall] = useState(false); // هشدار «آخرین ۳۰ ثانیه»
  const finalCallShownRef = useRef(false); // فقط یک بار در هر آزمون نمایش داده شود
  const [timeLeft, setTimeLeft] = useState(null); // میلی‌ثانیه باقی‌مانده
  const [deadlineTs, setDeadlineTs] = useState(null); // مهلت مطلق بر حسب زمان سرور
  const serverOffsetRef = useRef(0); // سرور − کلاینت (میلی‌ثانیه)
  const [late, setLate] = useState(false); // مهلت تمام شده ولی هنوز ارسال نشده
  const saveTimers = useRef({}); // { [questionId]: timeoutId }
  const pendingRef = useRef({}); // آخرین مقدار هر سؤال برای debounce
  const autoSubmittedRef = useRef(false);

  // بارگذاری آزمون + همگام‌سازی ساعت با سرور
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const t0 = Date.now();
        const data = await startExam(exam.id);
        const t1 = Date.now();
        if (cancelled) return;

        setSubmission(data.submission);
        setFullExam(data.exam);
        const offset = data.serverTime ? new Date(data.serverTime).getTime() - (t0 + t1) / 2 : 0;
        serverOffsetRef.current = offset;

        const answerMap = {};
        if (data.answers) {
          for (const [qId, ans] of Object.entries(data.answers)) {
            answerMap[qId] = {
              selectedOption: ans.selectedOption || '',
              textAnswer: ans.textAnswer || '',
            };
          }
        }
        setAnswers(answerMap);

        // مهلت پایان مطلق: startedAt + duration (بر حسب زمان سرور)
        if (data.submission?.startedAt && data.exam?.durationMinutes) {
          const startedAt = new Date(data.submission.startedAt).getTime();
          const deadline = startedAt + data.exam.durationMinutes * 60000;
          setDeadlineTs(deadline);
          setTimeLeft(Math.max(0, deadline - (Date.now() + offset)));
          if (deadline - (Date.now() + offset) <= 0) setLate(true);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [exam.id]);

  // تیک شمارش معکوس — هر ثانیه از روی مهلت مطلق + اختلاف ساعت سرور
  useEffect(() => {
    if (deadlineTs === null) return undefined;
    const offset = serverOffsetRef.current;
    const interval = setInterval(() => {
      const remaining = deadlineTs - (Date.now() + offset);
      setTimeLeft(remaining);
      // فراخوان نهایی: یک‌بار، در ۳۰ ثانیه‌ی آخر — داخل تیک تایمر (نه بدنه‌ی افکت)
      if (remaining > 0 && remaining <= 30 * 1000 && !finalCallShownRef.current) {
        finalCallShownRef.current = true;
        setShowFinalCall(true);
      }
      if (remaining <= 0) {
        clearInterval(interval);
        setLate(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadlineTs]);

  // پاک‌کردن تایمرهای debounce هنگام بستن
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // ذخیره‌ی یک پاسخ روی سرور — Promise برمی‌گرداند که موفق بود یا نه،
  // تا ارسال نهایی بتواند منتظر ذخیره‌ی همه‌ی پاسخ‌ها بماند.
  const persistAnswer = useCallback(
    (questionId, payload) => {
      if (!submission) return Promise.resolve(false);
      return saveExamAnswer(submission.id, payload)
        .then(() => true)
        .catch((err) => {
          console.error('خطا در ذخیره‌ی خودکار:', err.message);
          return false;
        });
    },
    [submission]
  );

  // زمان‌بندی ذخیره‌ی یک پاسخ با تأخیر مشخص.
  // اگر ذخیره ناموفق بود، رکورد در صف می‌ماند و حداکثر ۵ بار با فاصله‌ی ۳ ثانیه
  // دوباره تلاش می‌شود — اینطوری با یک خطای شبکه‌ی لحظه‌ای هیچ پاسخی گم نمی‌شود؛
  // هر پاسخی که حتی پس از این تلاش‌ها ذخیره نشده باشد، در ارسال نهایی دوباره فرستاده می‌شود.
  const scheduleSave = useCallback(
    (questionId, delay) => {
      clearTimeout(saveTimers.current[questionId]);
      saveTimers.current[questionId] = setTimeout(async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const p = pendingRef.current[questionId];
          if (!p || !submission) return;
          const ok = await persistAnswer(questionId, {
            questionId,
            selectedOption: p.selectedOption,
            textAnswer: p.textAnswer,
          });
          if (ok) {
            // حذف از صف فقط وقتی که مقدار جدیدتری جای آن را نگرفته باشد
            if (pendingRef.current[questionId] === p) {
              delete pendingRef.current[questionId];
            }
            return;
          }
          if (attempt === 0) {
            toast.warning('ذخیره‌ی خودکار پاسخ ناموفق بود؛ دوباره تلاش می‌کنیم…');
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }, delay);
    },
    [persistAnswer, submission, toast]
  );

  // به‌روزرسانی یک پاسخ + ذخیره‌ی خودکار با debounce (۸۰۰ms)
  // نکته‌ی مهم: رکورد پاسخ فقط بعد از ذخیره‌ی موفق از صف (pendingRef) حذف می‌شود؛
  // در غیر این صورت در ارسال نهایی دوباره تلاش می‌شود تا هیچ پاسخی گم نشود.
  const updateAnswer = useCallback(
    (questionId, field, value) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { selectedOption: '', textAnswer: '' }),
          [field]: value,
        },
      }));

      // آخرین مقدار هر سؤال نگه داشته می‌شود تا debounce درست کار کند
      pendingRef.current[questionId] = {
        ...(pendingRef.current[questionId] || { selectedOption: null, textAnswer: null }),
        [field]: field === 'selectedOption' ? Number(value) : value,
      };

      scheduleSave(questionId, 800);
    },
    [scheduleSave]
  );

  // پرش امن به سؤال بعدی: اگر سؤال فعلی پاسخ ذخیره‌نشده دارد، اول flush کن
  // flush موفق یعنی رکورد از صف حذف می‌شود؛ ناموفق یعنی می‌ماند تا ارسال نهایی دوباره تلاش کند
  const flushPending = useCallback(
    (questionId) => {
      const p = pendingRef.current[questionId];
      if (p && submission) {
        clearTimeout(saveTimers.current[questionId]);
        persistAnswer(questionId, {
          questionId,
          selectedOption: p.selectedOption,
          textAnswer: p.textAnswer,
        }).then((ok) => {
          if (ok && pendingRef.current[questionId] === p) {
            delete pendingRef.current[questionId];
          }
        });
      }
    },
    [persistAnswer, submission]
  );

  const questions = useMemo(() => fullExam?.questions || [], [fullExam]);

  // ارسال نهایی — توسط دکمه یا به‌صورت خودکار در پایان زمان
  const doSubmit = useCallback(async () => {
    if (submitting || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setShowSubmitConfirm(false);
    setShowFinalCall(false);
    setSubmitting(true);
    setError('');
    try {
      // مهم: اول منتظر بمان همه‌ی پاسخ‌های در صف ذخیره شوند — اگر submitExam زودتر برسد،
      // وضعیت SUBMITTED می‌شود و saveها با «قبلاً ارسال شده» رد می‌شوند (نمره‌ی صفر!)
      // پاسخِ موفق از صف حذف می‌شود؛ ناموفق می‌ماند تا در تلاش مجدد دوباره فرستاده شود.
      const qids = Object.keys(pendingRef.current);
      const results = await Promise.all(
        qids.map((qid) => {
          const p = pendingRef.current[qid];
          return persistAnswer(qid, { questionId: qid, ...p }).then((ok) => {
            if (ok) delete pendingRef.current[qid];
            return ok;
          });
        })
      );
      if (results.includes(false)) {
        throw new Error('ذخیره‌ی برخی پاسخ‌ها ناموفق بود — اتصال اینترنت را بررسی کن و دوباره تلاش کن');
      }
      const data = await submitExam(submission.id);
      setSubmitResult(data);
    } catch (err) {
      // اجازه‌ی تلاش مجدد — اگر ref ریست نشود، دکمه‌ی ارسال برای همیشه می‌میرد
      autoSubmittedRef.current = false;
      setError(err.message);
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }, [submission, submitting, persistAnswer]);

  // ارسال خودکار وقتی زمان تمام می‌شود
  useEffect(() => {
    if (late && submission && !submitResult && !autoSubmittedRef.current) {
      doSubmit();
    }
  }, [late, submission, submitResult, doSubmit]);

  // هشدارهای زمانی (۵ دقیقه و ۱ دقیقه مانده)
  const warned5 = useRef(false);
  const warned1 = useRef(false);
  useEffect(() => {
    if (timeLeft === null || late) return;
    if (timeLeft <= 5 * 60 * 1000 && timeLeft > 60 * 1000 && !warned5.current) {
      warned5.current = true;
      toast.info('۵ دقیقه به پایان آزمون مانده');
    }
    if (timeLeft <= 60 * 1000 && !warned1.current) {
      warned1.current = true;
      toast.warning('۱ دقیقه به پایان آزمون مانده!');
    }
  }, [timeLeft, late, toast]);

  // ناوبری با کیبورد: فلش چپ/راست بین سؤال‌ها (در حالت بدون فوکوس روی input)
  useEffect(() => {
    function onKey(e) {
      if (submitResult || loading) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') setCurrentIdx((i) => Math.min(i + 1, questions.length - 1));
      if (e.key === 'ArrowRight') setCurrentIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questions.length, submitResult, loading]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="exam-taker-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-state">
            <div className="spinner" />
            <p>در حال بارگذاری آزمون…</p>
          </div>
        </div>
      </div>
    );
  }

  // نمایش نتیجه پس از ارسال
  if (submitResult) {
    const isAutoGraded = submitResult.autoGraded;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="exam-taker-modal" onClick={(e) => e.stopPropagation()}>
          <div className="exam-result">
            <div className="exam-result-emoji">{isAutoGraded ? '🎉' : '✅'}</div>
            <h3>آزمون ارسال شد!</h3>
            {submitResult.maxScore !== undefined && (
              <p className="exam-result-score">
                {isAutoGraded
                  ? `نمره‌ی نهایی: ${toFaDigits(submitResult.autoScore)} از ${toFaDigits(submitResult.maxScore)}`
                  : `نمره‌ی سؤالات تستی: ${toFaDigits(submitResult.autoScore)} از ${toFaDigits(submitResult.autoMaxScore ?? submitResult.maxScore)}`
                }
              </p>
            )}
            {isAutoGraded ? (
              <p className="muted-text">این آزمون فقط تستی بود، پس نمره‌ی نهایی خودکار ثبت شد.</p>
            ) : (
              <p className="muted-text">سؤالات تشریحی نیاز به نمره‌دهی توسط مشاور دارند. پس از نمره‌دهی، نمره‌ی نهایی نمایش داده می‌شود.</p>
            )}
            <div className="exam-result-actions">
              <button className="btn-primary" onClick={onClose}>بستن</button>
              {onReview && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onClose();
                    onReview(exam.id);
                  }}
                >
                  🔍 مشاهده پاسخ‌ها
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="exam-taker-modal" onClick={(e) => e.stopPropagation()}>
          <div className="alert alert-error">
            <span>⚠</span> {error}
          </div>
          <button className="btn-primary" onClick={onClose}>بستن</button>
        </div>
      </div>
    );
  }

  if (!fullExam) return null;

  const currentQ = questions[currentIdx];
  const ans = currentQ ? answers[currentQ.id] || { selectedOption: '', textAnswer: '' } : {};
  const opts = currentQ?.options ? currentQ.options.split('|') : [];
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    return a.selectedOption !== '' && a.selectedOption !== undefined && a.selectedOption !== null
      || (a.textAnswer && a.textAnswer.trim() !== '');
  }).length;
  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  // شماره‌ی سؤال‌های بی‌پاسخ — برای چیپ‌های «پرش به سؤال» در فراخوان نهایی
  const unansweredIdx = questions.reduce((acc, q, i) => {
    const a = answers[q.id];
    const done =
      a && ((a.selectedOption !== '' && a.selectedOption !== undefined && a.selectedOption !== null) || (a.textAnswer && a.textAnswer.trim() !== ''));
    if (!done) acc.push(i);
    return acc;
  }, []);
  const isUrgent = timeLeft !== null && timeLeft <= 60 * 1000;
  const isWarning = timeLeft !== null && timeLeft <= 5 * 60 * 1000 && !isUrgent;

  return (
    <div className="modal-overlay exam-taker-overlay" onClick={onClose}>
      <div className="exam-taker-modal" onClick={(e) => e.stopPropagation()}>
        {/* سرصفحه: عنوان + تایمر */}
        <div className="exam-taker-head">
          <div>
            <h3>{fullExam.title}</h3>
            {fullExam.description && <p className="muted-text">{fullExam.description}</p>}
            <div className="exam-meta">
              <span>📝 {toFaDigits(questions.length)} سؤال</span>
              <span>✍️ {toFaDigits(answeredCount)} پاسخ داده‌شده</span>
            </div>
          </div>
          <div className="exam-timer-wrap">
            {timeLeft !== null && (
              <div className={`exam-timer ${isUrgent ? 'urgent' : isWarning ? 'warning' : ''}`} aria-live="polite">
                <span className="exam-timer-label">زمان باقی‌مانده</span>
                <span className="exam-timer-clock" dir="ltr">{formatCountdown(timeLeft)}</span>
              </div>
            )}
            {late && !submitResult && (
              <div className="exam-timer urgent submitting">
                <span className="exam-timer-label">زمان تمام شد</span>
                <span className="exam-timer-clock">در حال ارسال…</span>
              </div>
            )}
          </div>
          <button className="btn-icon-only" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </div>

        {/* نوار پیشرفت پاسخ‌ها */}
        <div className="exam-progress">
          <div className="exam-progress-bar">
            <span style={{ width: `${progressPct}%` }} />
          </div>
          <small>{toFaDigits(progressPct)}٪ پاسخ داده‌شده</small>
        </div>

        {/* شبکه‌ی ناوبری سؤال‌ها */}
        <div className="exam-nav-grid" role="tablist" aria-label="ناوبری سؤال‌ها">
          {questions.map((q, i) => {
            const a = answers[q.id];
            const isAnswered =
              a && ((a.selectedOption !== '' && a.selectedOption !== undefined && a.selectedOption !== null) || (a.textAnswer && a.textAnswer.trim() !== ''));
            return (
              <button
                key={q.id}
                role="tab"
                aria-selected={i === currentIdx}
                className={`exam-nav-dot ${i === currentIdx ? 'active' : ''} ${isAnswered ? 'answered' : ''} ${
                  q.type === 'DESCRIPTIVE' ? 'desc' : ''
                }`}
                onClick={() => {
                  if (currentQ) flushPending(currentQ.id);
                  setCurrentIdx(i);
                }}
                title={`سؤال ${toFaDigits(i + 1)}`}
              >
                {toFaDigits(i + 1)}
              </button>
            );
          })}
        </div>

        {/* سؤال فعلی */}
        {currentQ && (
          <div className="exam-take-question exam-take-question-single">
            <div className="exam-take-q-head">
              <span className="exam-take-q-num">سؤال {toFaDigits(currentIdx + 1)} از {toFaDigits(questions.length)}</span>
              <span className="exam-take-q-type">
                {currentQ.type === 'MULTIPLE_CHOICE' ? 'تستی' : 'تشریحی'}
              </span>
              <span className="exam-take-q-points">{toFaDigits(currentQ.points)} نمره</span>
            </div>

            {currentQ.imageUrl && (
              <div className="exam-q-image-wrap">
                <img src={currentQ.imageUrl} alt="صورت سؤال" className="exam-q-image" />
              </div>
            )}
            {currentQ.text && <p className="exam-take-q-text">{currentQ.text}</p>}

            {currentQ.type === 'MULTIPLE_CHOICE' ? (
              <div className="exam-options">
                {opts.map((opt, i) => (
                  <label
                    key={i}
                    className={`exam-option ${ans.selectedOption === i + 1 ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQ.id}`}
                      checked={ans.selectedOption === i + 1}
                      onChange={() => updateAnswer(currentQ.id, 'selectedOption', i + 1)}
                      disabled={late}
                    />
                    <span className="exam-option-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="exam-option-text">{opt.trim()}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                rows={6}
                value={ans.textAnswer}
                onChange={(e) => updateAnswer(currentQ.id, 'textAnswer', e.target.value)}
                placeholder="پاسخ خود را بنویس..."
                className="exam-descriptive-answer"
                disabled={late}
              />
            )}
          </div>
        )}

        {/* دکمه‌های ناوبری پایین — فقط قبلی/بعدی؛ «ارسال نهایی» تنها در ردیف پایینی است */}
        <div className="exam-taker-actions exam-taker-actions-nav">
          <button
            className="btn-secondary"
            onClick={() => {
              if (currentQ) flushPending(currentQ.id);
              setCurrentIdx((i) => Math.max(0, i - 1));
            }}
            disabled={currentIdx === 0}
          >
            › سؤال قبلی
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (currentQ) flushPending(currentQ.id);
              setCurrentIdx((i) => Math.min(questions.length - 1, i + 1));
            }}
            disabled={currentIdx >= questions.length - 1}
          >
            سؤال بعدی ‹
          </button>
        </div>

        {/* ردیف نهایی: ذخیره و خروج + ارسال */}
        <div className="exam-taker-actions">
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || late}>
            {submitting ? 'در حال ارسال…' : '📤 ارسال نهایی'}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            ذخیره و بستن
          </button>
        </div>

        {showSubmitConfirm && (
          <ConfirmModal
            message="آیا از ارسال نهایی آزمون مطمئنی؟ بعد از ارسال قابل تغییر نیست."
            confirmText="📤 بله، ارسال کن"
            danger={false}
            onConfirm={confirmSubmit}
            onCancel={() => setShowSubmitConfirm(false)}
          />
        )}

        {/* فراخوان نهایی — ۳۰ ثانیه‌ی آخر: مرور بی‌پاسخ‌ها یا ارسال فوری */}
        {showFinalCall && !late && !submitting && (
          <div
            className="modal-overlay exam-finalcall-overlay"
            onClick={() => setShowFinalCall(false)}
          >
            <div
              className="exam-finalcall"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label="هشدار پایان زمان آزمون"
            >
              <div className="exam-finalcall-timer" aria-live="polite">
                <span className="exam-finalcall-clock" dir="ltr">{formatCountdown(timeLeft)}</span>
                <span className="exam-finalcall-label">تا پایان آزمون</span>
              </div>

              {unansweredIdx.length > 0 ? (
                <>
                  <p className="exam-finalcall-title">
                    ⏳ {toFaDigits(unansweredIdx.length)} سؤال بی‌پاسخ مانده
                  </p>
                  <div className="exam-finalcall-chips">
                    {unansweredIdx.map((i) => (
                      <button
                        key={questions[i].id}
                        type="button"
                        className="exam-finalcall-chip"
                        onClick={() => jumpToQuestion(i)}
                        title={`پرش به سؤال ${toFaDigits(i + 1)}`}
                      >
                        {toFaDigits(i + 1)}
                      </button>
                    ))}
                  </div>
                  <p className="exam-finalcall-hint">
                    روی شماره‌ی هر سؤال بزن تا همان سؤال باز شود و سریع جواب بدهی.
                  </p>
                </>
              ) : (
                <p className="exam-finalcall-title">به همه‌ی سؤال‌ها پاسخ دادی! 🎯</p>
              )}

              <p className="exam-finalcall-note">
                با پایان زمان، آزمون به‌صورت خودکار ارسال می‌شود و قابل تغییر نیست.
              </p>
              <div className="confirm-modal-actions">
                <button className="btn-primary" onClick={confirmSubmit}>
                  📤 همان حالا ارسال کن
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowFinalCall(false)}
                >
                  ادامه می‌دهم
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function jumpToQuestion(idx) {
    if (currentQ) flushPending(currentQ.id);
    setCurrentIdx(idx);
    setShowFinalCall(false);
  }

  async function handleSubmit() {
    flushPending(currentQ?.id);
    setShowSubmitConfirm(true);
  }

  async function confirmSubmit() {
    await doSubmit();
  }
}
