import SectionGuide from '../SectionGuide';
import ExamBuilder from '../ExamBuilder';
import { formatJalaliDate, formatJalaliDateTime, toFaDigits } from '../../utils/jalali';
import Ico from '../Ico';

export default function AdvisorExamsSection({
  userId,
  selectedStudent,
  students,
  exams,
  examBuilderState,
  setExamBuilderState,
  handleExamSaved,
  handleOpenGrading,
  handleDeleteExam,
}) {
  return (
    <section id="section-exams" className="exams-section">
      <SectionGuide
        userId={userId}
        guideKey="advisor-exams"
        icon="📝"
        title="آزمون‌ها — بساز، تصحیح کن، نمره بده"
        items={[
          'آزمون تستی یا تشریحی بساز و زمان نمایشش را مشخص کن.',
          'بعد از ثبت پاسخ‌ها، تستی خودکار تصحیح می‌شود؛ تشریحی را همین‌جا نمره بده.',
          'نمره برای دانش‌آموز (و والد) نمایش داده می‌شود.',
        ]}
        tone="amber"
      />
      <div className="section-head">
        <h3 className="section-title">
          <span className="section-emoji"><Ico e="📝" /></span>
          آزمون‌های {selectedStudent.fullName}
        </h3>
        {!examBuilderState && (
          <button className="btn-primary" data-tour="exams-new" onClick={() => setExamBuilderState('create')} type="button">
            <span aria-hidden>+</span> ساخت آزمون
          </button>
        )}
      </div>

      {examBuilderState && (
        <div className="builder-wrap">
          <ExamBuilder
            studentId={selectedStudent.id}
            students={students}
            existingExam={examBuilderState === 'create' ? null : examBuilderState.exam}
            onSaved={handleExamSaved}
            onCancel={() => setExamBuilderState(null)}
          />
        </div>
      )}

      {!examBuilderState && exams.length === 0 && (
        <div className="empty-card">
          <span className="empty-emoji" aria-hidden><Ico e="📝" /></span>
          <p>هنوز آزمونی برای این دانش‌آموز نساخته‌ای.</p>
        </div>
      )}

      {!examBuilderState && exams.map((exam) => {
        const subs = exam.submissions || [];
        const graded = subs.filter((s) => s.status === 'GRADED').length;
        const submitted = subs.filter((s) => s.status === 'SUBMITTED').length;
        const hasDescriptive = (exam.questions || []).some(
          (q) => q.type === 'DESCRIPTIVE'
        );
        const allGraded = subs.length > 0 && graded === subs.length;
        return (
          <div key={exam.id} className="card exam-card">
            <div className="exam-card-head">
              <div>
                <h4 className="exam-title">{exam.title}</h4>
                {exam.description && <p className="muted-text">{exam.description}</p>}
                <div className="exam-meta">
                  <span><Ico e="⏱" /> {toFaDigits(exam.durationMinutes)} دقیقه</span>
                  <span><Ico e="📝" /> {toFaDigits(exam.questions?.length || 0)} سؤال</span>
                  {hasDescriptive && (
                    <span className="exam-meta-tag desc">شامل تشریحی</span>
                  )}
                  <span className={`exam-visibility ${exam.visibleToStudent ? 'visible' : 'hidden'}`}>
                    {exam.visibleToStudent
                      ? <><Ico e="🔍" /> قابل مشاهده</>
                      : exam.visibleFrom
                        ? <><Ico e="🔒" /> تا {formatJalaliDate(exam.visibleFrom, { withYear: false })}</>
                        : <><Ico e="🔒" /> تا زمان شروع</>}
                  </span>
                </div>
                <p className="muted-text">
                  <Ico e="📅" /> {formatJalaliDateTime(exam.scheduledAt)}
                </p>
              </div>

              <div className="exam-actions exam-actions-col">
                {allGraded ? (
                  <>
                    <span className="exam-status-pill graded">
                      <Ico e="✅" /> نمره داده شد: {toFaDigits(subs[0]?.totalScore)} از {toFaDigits(subs[0]?.maxScore)}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => handleOpenGrading(exam)}
                    >
                      <Ico e="👁" /> مشاهده پاسخ‌برگ
                    </button>
                  </>
                ) : submitted > 0 ? (
                  <>
                    <span className="exam-status-pill needs-grading">
                      <Ico e="✍" /> {toFaDigits(submitted)} ارسال در انتظار نمره‌دهی
                    </span>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenGrading(exam)}
                    >
                      {hasDescriptive ? <><Ico e="📝" /> نمره‌دهی تشریحی‌ها</> : <><Ico e="📋" /> مشاهده پاسخ‌ها</>}
                    </button>
                  </>
                ) : subs.length > 0 ? (
                  <span className="exam-status-pill progress">
                    <Ico e="⏳" /> دانش‌آموز در حال آزمون دادن است
                  </span>
                ) : (
                  <span className="exam-status-pill waiting">
                    <Ico e="⌛" /> هنوز شروع نشده
                  </span>
                )}
                <div className="exam-actions-row">
                  <button
                    type="button"
                    className="btn-icon edit"
                    title="ویرایش"
                    onClick={() => setExamBuilderState({ exam })}
                    disabled={!!examBuilderState}
                  >
                    <Ico e="✎" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="حذف"
                    onClick={() => handleDeleteExam(exam.id)}
                    disabled={!!examBuilderState}
                  >
                    <Ico e="🗑" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

