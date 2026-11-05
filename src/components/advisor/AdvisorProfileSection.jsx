import SectionGuide from '../SectionGuide';
import StudentNotes from './StudentNotes';
import StudentOverviewSummary from './StudentOverviewSummary';
import ProgressOverview from './ProgressOverview';
import StudentContactInfo from './StudentContactInfo';
import FaNumberInput from '../FaNumberInput';
import Ico from '../Ico';
import { formatRelativeTime, formatJalaliDate, toFaDigits } from '../../utils/jalali';

export default function AdvisorProfileSection({
  userId,
  selectedStudent,
  plans,
  entries,
  progressRows,
  editingGoal,
  setEditingGoal,
  goalInput,
  setGoalInput,
  handleSaveGoal,
  reminderText,
  setReminderText,
  handleFillQuote,
  handleSendReminder,
  sending,
  reminders,
  handleDeleteReminder,
}) {
  return (
    <>
      <SectionGuide
        userId={userId}
        guideKey="advisor-student-overview"
        icon="👤"
        title="مرور اجمالی دانش‌آموز"
        items={[
          'کارت‌های بالا خلاصه‌ی وضعیت را نشان می‌دهند؛ هدف هفتگی و اطلاعات تماس زیرشان است.',
          'یادآور برای دانش‌آموز می‌فرستی و یادداشت خصوصی می‌نویسی؛ یادداشت‌ها را فقط خودت می‌بینی.',
          'برای برنامه، آزمون و بقیه‌ی بخش‌ها از دکمه‌ی منو (سه‌خط) بالای صفحه استفاده کن.',
        ]}
      />

      {/* یادداشت‌های خصوصی مشاور */}
      <StudentNotes studentId={selectedStudent.id} />

      <StudentOverviewSummary student={selectedStudent} plans={plans.filter((p) => !p.isDraft)} entries={entries} />

      <ProgressOverview rows={progressRows} />

      <StudentContactInfo student={selectedStudent} />

      <section className="card goal-card" data-tour="ov-goal">
        <h3 className="card-title">
          <span aria-hidden><Ico e="🎯" /></span> هدف ساعت مطالعه‌ی هفتگی
        </h3>
        {!editingGoal ? (
          <div className="goal-display">
            <p className="goal-current">
              {selectedStudent.weeklyGoalMinutes
                ? `هدف فعلی: ${toFaDigits(Math.round(selectedStudent.weeklyGoalMinutes / 60))} ساعت در هفته`
                : 'هنوز هدفی تعیین نشده.'}
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setGoalInput(selectedStudent.weeklyGoalMinutes ? String(Math.round(selectedStudent.weeklyGoalMinutes / 60)) : '');
                setEditingGoal(true);
              }}
            >
              <Ico e="✎" /> ویرایش هدف
            </button>
          </div>
        ) : (
          <div className="goal-edit">
            <label className="goal-input-label">
              ساعت مطالعه در هفته
              <FaNumberInput
                value={goalInput}
                onChange={(v) => setGoalInput(v)}
                placeholder="مثلاً ۲۰"
              />
            </label>
            <div className="goal-edit-actions">
              <button type="button" className="btn-primary" onClick={handleSaveGoal}>
                ذخیره
              </button>
              <button type="button" className="btn-ghost" onClick={() => setEditingGoal(false)}>
                انصراف
              </button>
            </div>
          </div>
        )}
      </section>

      <section id="section-reminders" className="card reminder-card" data-tour="ov-reminders">
        <h3 className="card-title">
          <span aria-hidden><Ico e="✉" /></span> فرستادن یادآور به {selectedStudent.fullName}
        </h3>
        <SectionGuide
          userId={userId}
          guideKey="advisor-reminders"
          icon="✉️"
          title="یادآور — یک پیام کوتاه به دانش‌آموز"
          items={[
            'متن یادآور را بنویس (یا از جمله‌ی انگیزشی استفاده کن) و ارسال کن.',
            'یادآور بلافاصله در پنل دانش‌آموز نمایش داده می‌شود.',
          ]}
          tone="amber"
        />
        <form onSubmit={handleSendReminder} className="reminder-form">
          <textarea
            rows={3}
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
            placeholder="متن یادآور را بنویس یا از جمله‌ی انگیزشی استفاده کن…"
          />
          <div className="reminder-actions">
            <button type="button" className="btn-secondary" onClick={handleFillQuote}>
              <span aria-hidden><Ico e="✨" /></span> جمله‌ی انگیزشی
            </button>
            <button type="submit" className="btn-primary" disabled={sending || !reminderText.trim()}>
              {sending ? 'در حال ارسال…' : <><Ico e="📤" /> ارسال</>}
            </button>
          </div>
        </form>

        <div className="reminder-list">
          {reminders.length === 0 && (
            <p className="muted-text">تا الان یادآوری برای این دانش‌آموز نفرستاده‌ای.</p>
          )}
          {reminders.map((r) => (
            <div key={r.id} className="reminder-card-mini">
              <div className="reminder-avatar"><Ico e="💬" /></div>
              <div className="reminder-content">
                <p className="reminder-text">{r.message}</p>
                <span className="reminder-time" title={formatJalaliDate(r.createdAt)}>
                  {formatRelativeTime(r.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="btn-icon-only"
                title="حذف یادآور"
                onClick={() => handleDeleteReminder(r.id)}
              >
                <Ico e="✕" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

