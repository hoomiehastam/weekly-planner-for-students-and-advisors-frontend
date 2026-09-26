import { useEffect, useMemo, useState } from 'react';
import { toFaDigits, formatJalaliDate } from '../../utils/jalali';
import FaNumberInput from '../FaNumberInput';

// مودال پاسخ‌ها و نمره‌دهی (مشاور/سوپرادمین) — بازطراحی کامل:
//   • تب برای هر دانش‌آموز (حتی تک‌ارسال، با نوار مشخصات)
//   • پاسخ‌برگ: سؤالات تستی خودکار نمایش داده می‌شوند (بدون ورودی نمره)
//   • سؤالات تشریحی با ورودی نمره + دکمه‌های سریع «کامل» / «صفر»
//   • جمع زنده‌ی بخش تستی / تشریحی / کل
//   • ناوبری بین دانش‌آموزها + «ثبت و بعدی»
// props:
//   data     { exam, submissions } — از fetchExamSubmissions (شامل student.fullName)
//   onClose  بستن مودال
//   onGrade(submissionId, payload) — نمره‌دهی روی سرور
const STATUS_LABEL = {
  GRADED: 'نمره‌داده‌شده',
  SUBMITTED: 'ارسال‌شده',
  IN_PROGRESS: 'در حال انجام',
};

const OPTION_LETTERS = ['۱', '۲', '۳', '۴', '۵', '۶'];

function fmt(n) {
  if (n === null || n === undefined || n === '') return '۰';
  const num = Number(n);
  if (!Number.isFinite(num)) return '۰';
  return toFaDigits(num % 1 === 0 ? String(num) : String(num).toFixed(2).replace(/\.?0+$/, ''));
}

export default function GradingModal({ data, onClose, onGrade }) {
  const { exam, submissions } = data;
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [answerScores, setAnswerScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submission = submissions[selectedIdx];

  // بستن با کلید Escape (وقتی روی ورودی نیستیم تا تایپ کاربر قطع نشود)
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // محاسبه‌ی جمع‌ها به تفکیک نوع سؤال — زنده، بر اساس ورودی‌های فعلی
  const totals = useMemo(() => {
    if (!submission) return { mc: 0, mcMax: 0, desc: 0, descMax: 0, total: 0, maxScore: 0 };
    let mc = 0, mcMax = 0, desc = 0, descMax = 0;
    for (const a of submission.answers) {
      const q = a.question || {};
      const pts = q.points || 1;
      if (q.type === 'MULTIPLE_CHOICE') {
        mcMax += pts;
        mc += a.score || 0;
      } else {
        descMax += pts;
        desc += answerScores[a.id] !== undefined ? Number(answerScores[a.id] || 0) : a.score || 0;
      }
    }
    return { mc, mcMax, desc, descMax, total: mc + desc, maxScore: mcMax + descMax };
  }, [submission, answerScores]);

  if (!submission) return null;

  const isLocked = submission.status === 'GRADED';
  const studentName = submission.student?.fullName || 'دانش‌آموز';
  const gradedCount = submissions.filter((s) => s.status === 'GRADED').length;
  const hasMixed = submissions.some((s) =>
    s.answers.some((a) => a.question?.type === 'DESCRIPTIVE')
  );

  function setScore(answerId, value) {
    setAnswerScores((prev) => ({ ...prev, [answerId]: value }));
  }

  async function handleSave({ goNext = false } = {}) {
    setSaving(true);
    setError('');
    try {
      const answersPayload = submission.answers.map((a) => ({
        id: a.id,
        score: answerScores[a.id] !== undefined ? Number(answerScores[a.id]) : a.score,
      }));
      await onGrade(submission.id, {
        answers: answersPayload,
        feedback: feedback || null,
      });
      if (goNext && selectedIdx < submissions.length - 1) {
        setSelectedIdx(selectedIdx + 1);
        setAnswerScores({});
        setFeedback('');
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function selectStudent(i) {
    setSelectedIdx(i);
    setAnswerScores({});
    setFeedback('');
    setError('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="grading-modal" onClick={(e) => e.stopPropagation()}>
        <div className="grading-modal-head">
          <h3>📋 پاسخ‌ها و نمره‌دهی: {exam.title}</h3>
          <button className="btn-icon-only" onClick={onClose} aria-label="بستن">✕</button>
        </div>

        <div className="grading-progress-strip">
          <span>
            {toFaDigits(submissions.length)} دانش‌آموز — {toFaDigits(gradedCount)} نمره‌داده‌شده
          </span>
          {hasMixed && <span className="grading-mode-badge">تستی خودکار + تشریحی دستی</span>}
        </div>

        {/* تب دانش‌آموزها — فقط وقتی بیش از یک ارسال داریم */}
        {submissions.length > 1 && (
          <div className="grading-student-tabs" role="tablist">
            {submissions.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === selectedIdx}
                className={`grading-student-tab ${i === selectedIdx ? 'active' : ''} ${s.status === 'GRADED' ? 'graded' : ''}`}
                onClick={() => selectStudent(i)}
              >
                <span className="tab-name">{s.student?.fullName || `دانش‌آموز ${toFaDigits(i + 1)}`}</span>
                <span className={`tab-status ${s.status === 'GRADED' ? 'graded' : s.status === 'SUBMITTED' ? 'submitted' : ''}`}>
                  {s.status === 'GRADED' ? `${fmt(s.totalScore)}/${fmt(s.maxScore)}` : STATUS_LABEL[s.status]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* نوار مشخصات دانش‌آموز فعلی + ناوبری */}
        <div className="grading-student-bar">
          <button
            className="btn-icon-only"
            onClick={() => selectStudent(selectedIdx - 1)}
            disabled={selectedIdx === 0}
            aria-label="دانش‌آموز قبلی"
          >
            ›
          </button>
          <div className="grading-student-info">
            <strong>{studentName}</strong>
            <span className={`status-dot ${isLocked ? 'graded' : submission.status === 'SUBMITTED' ? 'submitted' : 'progress'}`}>
              {STATUS_LABEL[submission.status]}
            </span>
            {submission.submittedAt && (
              <span className="muted-text">
                ارسال: {formatJalaliDate(submission.submittedAt, { withYear: false })}
              </span>
            )}
          </div>
          <button
            className="btn-icon-only"
            onClick={() => selectStudent(selectedIdx + 1)}
            disabled={selectedIdx >= submissions.length - 1}
            aria-label="دانش‌آموز بعدی"
          >
            ‹
          </button>
        </div>

        {/* تابلوی نمره — جمع زنده */}
        <div className="grading-scoreboard">
          <div className="score-chip">
            <span className="score-chip-label">تستی</span>
            <span className="score-chip-value">{fmt(totals.mc)} از {fmt(totals.mcMax)}</span>
          </div>
          <div className="score-chip">
            <span className="score-chip-label">تشریحی</span>
            <span className="score-chip-value">{fmt(totals.desc)} از {fmt(totals.descMax)}</span>
          </div>
          <div className="score-chip total">
            <span className="score-chip-label">جمع کل</span>
            <span className="score-chip-value">{fmt(totals.total)} از {fmt(totals.maxScore)}</span>
          </div>
        </div>

        {isLocked && (
          <div className="alert alert-info grading-locked-note">
            نمره‌ی این دانش‌آموز ثبت و تثبیت شده است.
          </div>
        )}

        {/* پاسخ‌برگ */}
        <div className="grading-answers">
          {submission.answers.map((a, idx) => {
            const q = a.question || {};
            const isMC = q.type === 'MULTIPLE_CHOICE';
            const opts = q.options ? q.options.split('|') : [];
            const score = answerScores[a.id] !== undefined ? answerScores[a.id] : a.score ?? '';
            const answered = a.selectedOption !== null && a.selectedOption !== undefined;
            const isCorrect = isMC && answered && a.selectedOption === q.correctOption;

            return (
              <div key={a.id} className={`grading-answer-row ${isMC ? (isCorrect ? 'row-correct' : answered ? 'row-wrong' : 'row-blank') : ''}`}>
                <div className="grading-q-head">
                  <span className="grading-q-num">{toFaDigits(idx + 1)}</span>
                  <span className={`q-type-badge ${isMC ? 'mc' : 'desc'}`}>{isMC ? 'تستی' : 'تشریحی'}</span>
                  <span className="muted-text">{fmt(q.points)} نمره</span>
                </div>

                {q.imageUrl && (
                  <div className="exam-q-image-wrap">
                    <img src={q.imageUrl} alt="صورت سؤال" className="exam-q-image" />
                  </div>
                )}
                {q.text && <p className="grading-q-text">{q.text}</p>}

                {isMC ? (
                  <div className="grading-mc-block">
                    {opts.map((opt, i) => {
                      const selected = a.selectedOption === i + 1;
                      const correct = q.correctOption === i + 1;
                      return (
                        <div key={i} className={`mc-opt-line ${selected ? 'selected' : ''} ${correct ? 'correct' : ''}`}>
                          <span className="mc-opt-letter">{OPTION_LETTERS[i] || toFaDigits(i + 1)}</span>
                          <span className="mc-opt-text">{opt.trim() || `گزینه‌ی ${toFaDigits(i + 1)}`}</span>
                          {correct && <span className="mc-opt-flag correct">✓ صحیح</span>}
                          {selected && !correct && <span className="mc-opt-flag wrong">✗ پاسخ دانش‌آموز</span>}
                          {selected && correct && <span className="mc-opt-flag pick">پاسخ دانش‌آموز</span>}
                        </div>
                      );
                    })}
                    {!answered && (
                      <div className="mc-unanswered">دانش‌آموز به این سؤال پاسخ نداده است</div>
                    )}
                  </div>
                ) : (
                  <div className="grading-descriptive">
                    <div className="bio-label">پاسخ دانش‌آموز:</div>
                    <div className={`grading-answer-text ${!a.textAnswer ? 'empty' : ''}`}>
                      {a.textAnswer || '(خالی)'}
                    </div>
                    <div className="grading-score-row">
                      <label className="grading-score-label">
                        نمره:
                        <FaNumberInput
                          decimals={2}
                          value={score}
                          onChange={(v) => setScore(a.id, v)}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-chip"
                        onClick={() => setScore(a.id, q.points || 1)}
                        disabled={isLocked}
                      >
                        کامل
                      </button>
                      <button
                        type="button"
                        className="btn-chip danger"
                        onClick={() => setScore(a.id, 0)}
                        disabled={isLocked}
                      >
                        صفر
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <label className="field-label">
          توضیحات برای دانش‌آموز (اختیاری)
          <textarea
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="بازخورد کلی درباره‌ی آزمون..."
            disabled={isLocked}
          />
        </label>

        {error && (
          <div className="alert alert-error">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="grading-actions">
          <button
            className="btn-primary"
            onClick={() => handleSave()}
            disabled={saving || isLocked}
          >
            {saving ? 'در حال ذخیره…' : isLocked ? 'نمره تثبیت شده' : '💾 ثبت نمره'}
          </button>
          {submissions.length > 1 && selectedIdx < submissions.length - 1 && (
            <button
              className="btn-secondary"
              onClick={() => handleSave({ goNext: true })}
              disabled={saving || isLocked}
            >
              ثبت و بعدی ›
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
}
