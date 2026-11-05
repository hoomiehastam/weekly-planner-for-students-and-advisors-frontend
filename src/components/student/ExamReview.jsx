import { useEffect, useState } from 'react';
import { fetchExamReview } from '../../api/client';
import { toFaDigits, formatJalaliDateTime } from '../../utils/jalali';
import Ico from '../Ico';

// مرور آزمون توسط دانش‌آموز — پس از ارسال.
// برای سؤال تستی: پاسخ خودش، گزینه‌ی صحیح، صحیح/غلط/بی‌پاسخ و نمره.
// برای سؤال تشریحی: پاسخ خودش + وضعیت نمره‌دهی مشاور (بدون قضاوت صحیح/غلط).
// props:
//   examId   شناسه‌ی آزمون
//   onClose  بستن مودال
const VERDICT_LABEL = {
  correct: { text: 'صحیح', cls: 'correct', icon: '✓' },
  wrong: { text: 'نادرست', cls: 'wrong', icon: '✗' },
  unanswered: { text: 'بی‌پاسخ', cls: 'blank', icon: null },
};
const OPTION_LETTERS = ['۱', '۲', '۳', '۴', '۵', '۶'];

function fmtScore(n) {
  if (n === null || n === undefined) return null;
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return toFaDigits(num % 1 === 0 ? String(num) : String(num).toFixed(2).replace(/\.?0+$/, ''));
}

export default function ExamReview({ examId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchExamReview(examId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examId]);

  // بستن با Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sub = data?.submission;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="grading-modal exam-review-modal" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>در حال بارگذاری پاسخ‌ها…</p>
          </div>
        )}

        {!loading && error && (
          <>
            <div className="alert alert-error">
              <span><Ico e="⚠" /></span> {error}
            </div>
            <button className="btn-primary" onClick={onClose}>بستن</button>
          </>
        )}

        {!loading && !error && data && (
          <>
            <div className="grading-modal-head">
              <h3><Ico e="🔍" /> مرور پاسخ‌ها</h3>
              <button className="btn-icon-only" onClick={onClose} aria-label="بستن"><Ico e="✕" /></button>
            </div>

            <div className="grading-scoreboard">
              <div className="score-chip total">
                <span className="score-chip-label">نمره‌ی شما</span>
                <span className="score-chip-value">
                  {fmtScore(sub.totalScore) ?? '—'} از {fmtScore(sub.maxScore) ?? '—'}
                </span>
              </div>
              <div className="score-chip">
                <span className="score-chip-label">وضعیت</span>
                <span className="score-chip-value">
                  {sub.status === 'GRADED' ? 'نمره‌ی نهایی ثبت شد' : 'در انتظار نمره‌دهی تشریحی‌ها'}
                </span>
              </div>
              {sub.submittedAt && (
                <div className="score-chip">
                  <span className="score-chip-label">تاریخ ارسال</span>
                  <span className="score-chip-value">{formatJalaliDateTime(sub.submittedAt)}</span>
                </div>
              )}
            </div>

            {sub.feedback && (
              <div className="alert alert-info">
                <span><Ico e="💬" /></span> {sub.feedback}
              </div>
            )}

            <div className="grading-answers">
              {data.review.map((q, idx) => {
                const isMC = q.type === 'MULTIPLE_CHOICE';
                const verdict = VERDICT_LABEL[q.verdict] || null;
                return (
                  <div
                    key={q.id}
                    className={`grading-answer-row ${
                      verdict ? `row-${verdict.cls === 'blank' ? 'blank' : verdict.cls}` : ''
                    }`}
                  >
                    <div className="grading-q-head">
                      <span className="grading-q-num">{toFaDigits(idx + 1)}</span>
                      <span className={`q-type-badge ${isMC ? 'mc' : 'desc'}`}>
                        {isMC ? 'تستی' : 'تشریحی'}
                      </span>
                      <span className="muted-text">{toFaDigits(q.points)} نمره</span>
                      {verdict && (
                        <span className={`exam-review-verdict ${verdict.cls}`}>
                          {verdict.icon && <Ico e={verdict.icon} />} {verdict.text}
                        </span>
                      )}
                      {isMC && fmtScore(q.score) !== null && (
                        <span className="exam-review-score">
                          {fmtScore(q.score)} از {fmtScore(q.points)}
                        </span>
                      )}
                    </div>

                    {q.imageUrl && (
                      <div className="exam-q-image-wrap">
                        <img src={q.imageUrl} alt="صورت سؤال" className="exam-q-image" />
                      </div>
                    )}
                    {q.text && <p className="grading-q-text">{q.text}</p>}

                    {isMC ? (
                      <div className="grading-mc-block">
                        {(q.options || []).map((opt, i) => {
                          const selected = q.selectedOption === i + 1;
                          const correct = q.correctOption === i + 1;
                          return (
                            <div
                              key={i}
                              className={`mc-opt-line ${selected ? 'selected' : ''} ${correct ? 'correct' : ''}`}
                            >
                              <span className="mc-opt-letter">{OPTION_LETTERS[i] || toFaDigits(i + 1)}</span>
                              <span className="mc-opt-text">{opt.trim() || `گزینه‌ی ${toFaDigits(i + 1)}`}</span>
                              {correct && <span className="mc-opt-flag correct">گزینه‌ی صحیح</span>}
                              {selected && !correct && <span className="mc-opt-flag wrong">پاسخ شما</span>}
                              {selected && correct && <span className="mc-opt-flag pick">پاسخ شما</span>}
                            </div>
                          );
                        })}
                        {q.verdict === 'unanswered' && (
                          <div className="mc-unanswered">به این سؤال پاسخ نداده‌ای</div>
                        )}
                      </div>
                    ) : (
                      <div className="grading-descriptive">
                        <div className="bio-label">پاسخ تو:</div>
                        <div className={`grading-answer-text ${!q.textAnswer ? 'empty' : ''}`}>
                          {q.textAnswer || '(پاسخ ندادی)'}
                        </div>
                        <div className="exam-review-desc-status">
                          {sub.status === 'GRADED' ? (
                            <span className="exam-review-verdict graded">
                              نمره‌ی مشاور: {fmtScore(q.score) ?? '۰'} از {fmtScore(q.points)}
                            </span>
                          ) : (
                            <span className="exam-review-verdict pending">
                              در انتظار نمره‌دهی مشاور
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grading-actions">
              <button className="btn-primary" onClick={onClose}>بستن</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
