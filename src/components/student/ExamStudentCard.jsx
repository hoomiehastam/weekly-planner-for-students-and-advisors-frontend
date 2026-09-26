import { toFaDigits, formatJalaliDateTime } from '../../utils/jalali';

// کارت آزمون در داشبورد دانش‌آموز.
// props:
//   exam     آزمون (از fetchMyExams)
//   onStart(exam)        شروع آزمون
//   onReview(exam)       مرور پاسخ‌های آزمون ارسال‌شده
export default function ExamStudentCard({ exam, onStart, onReview }) {
  const submission = exam.submissions?.[0];
  const isSubmitted =
    submission && (submission.status === 'SUBMITTED' || submission.status === 'GRADED');
  const isGraded = submission?.status === 'GRADED';

  // پایان واقعی آزمون = زمان شروع دانش‌آموز + مدت (نه scheduledAt!)
  // چون سرور مهلت را از startedAt می‌سنجد و اگر دیر شروع کند، پایان هم عقب می‌افتد.
  const startedAt = submission?.startedAt ? new Date(submission.startedAt) : null;
  const deadline = startedAt
    ? new Date(startedAt.getTime() + exam.durationMinutes * 60000)
    : new Date(new Date(exam.scheduledAt).getTime() + exam.durationMinutes * 60000);

  // در آزمون ترکیبی (تستی + تشریحی)، پیش از نمره‌دهی فقط نمره‌ی بخش تستی معنا دارد
  const questions = exam.questions || [];
  const isMixed =
    questions.some((q) => q.type === 'DESCRIPTIVE') &&
    questions.some((q) => q.type === 'MULTIPLE_CHOICE');
  const mcMaxScore = questions
    .filter((q) => q.type === 'MULTIPLE_CHOICE')
    .reduce((s, q) => s + (q.points || 1), 0);

  return (
    <div className="card exam-student-card">
      <div className="exam-student-head">
        <div>
          <h4 className="exam-title">{exam.title}</h4>
          {exam.description && <p className="muted-text">{exam.description}</p>}
          <div className="exam-meta">
            <span>⏱ مدت: {toFaDigits(exam.durationMinutes)} دقیقه</span>
            <span>📝 {toFaDigits(questions.length)} سؤال</span>
          </div>
          <div className="exam-time-info">
            <span className="exam-time-row">
              <span className="exam-time-label">🟢 شروع آزمون:</span>
              <span className="exam-time-value">
                {startedAt ? formatJalaliDateTime(startedAt) : formatJalaliDateTime(exam.scheduledAt)}
              </span>
            </span>
            <span className="exam-time-row">
              <span className="exam-time-label">🔴 پایان:</span>
              <span className="exam-time-value">{formatJalaliDateTime(deadline)}</span>
            </span>
          </div>
        </div>
        <div className="exam-student-status">
          {isGraded ? (
            <div className="exam-graded-badge">
              <span>نمره: {toFaDigits(submission.totalScore)} از {toFaDigits(submission.maxScore)}</span>
              {submission.feedback && <p className="exam-feedback">{submission.feedback}</p>}
              {onReview && (
                <button className="btn-secondary btn-sm" onClick={() => onReview(exam)}>
                  🔍 مشاهده پاسخ‌ها
                </button>
              )}
            </div>
          ) : isSubmitted ? (
            isMixed ? (
              <div className="exam-submitted-badge">
                <span>نمره‌ی تستی: {toFaDigits(submission.totalScore)} از {toFaDigits(mcMaxScore)}</span>
                <p className="exam-feedback">سؤالات تشریحی در انتظار نمره‌دهی مشاور است</p>
                {onReview && (
                  <button className="btn-secondary btn-sm" onClick={() => onReview(exam)}>
                    🔍 مشاهده پاسخ‌ها
                  </button>
                )}
              </div>
            ) : (
              <div className="exam-submitted-badge">
                ✅ ارسال شده — در انتظار نمره
                {onReview && (
                  <button className="btn-secondary btn-sm" onClick={() => onReview(exam)}>
                    🔍 مشاهده پاسخ‌ها
                  </button>
                )}
              </div>
            )
          ) : (
            <button className="btn-primary" onClick={() => onStart(exam)}>
              📝 شروع آزمون
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
