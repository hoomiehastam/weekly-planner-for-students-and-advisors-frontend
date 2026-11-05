import { useState, useRef, useMemo } from 'react';
import { createExam, updateExam } from '../api/client';
import { useToast } from '../context/ToastContext';
import JalaliDatePicker from './JalaliDatePicker';
import FaNumberInput from './FaNumberInput';
import TimeInput from './TimeInput';
import DraftNotice from './DraftNotice';
import { useAuth } from '../context/AuthContext';
import { useDraft } from '../hooks/useDraft';
import { clearDraft, draftKey, readDraft } from '../utils/drafts';
import { toFaDigits } from '../utils/jalali';
import Ico from './Ico';

// تبدیل ISO به YYYY-MM-DD
function toDateOnly(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeOnly(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '09:00';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

function combineDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const time = timeStr || '09:00';
  return new Date(`${dateStr}T${time}:00`).toISOString();
}

// تبدیل فایل به base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// کامپوننت ردیف گزینه — رابط کاربری ساده‌تر
function OptionRow({ index, value, isCorrect, onChange, onRemove, onToggleCorrect, canRemove }) {
  const letter = String.fromCharCode(65 + index); // A, B, C, D...
  return (
    <div className={`option-row ${isCorrect ? 'correct' : ''}`}>
      <button
        type="button"
        className={`option-correct-btn ${isCorrect ? 'active' : ''}`}
        onClick={() => onToggleCorrect(index)}
        title={isCorrect ? 'گزینه‌ی صحیح' : 'انتخاب به‌عنوان صحیح'}
      >
        {isCorrect ? <Ico e="✓" /> : letter}
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder={`گزینه‌ی ${toFaDigits(index + 1)}`}
        className="option-input"
      />
      {canRemove && (
        <button
          type="button"
          className="btn-icon-only option-remove"
          onClick={() => onRemove(index)}
          title="حذف گزینه"
        >
          <Ico e="✕" />
        </button>
      )}
    </div>
  );
}

// کامپوننت سؤال
function QuestionCard({ question, idx, onUpdate, onRemove }) {
  const fileInputRef = useRef(null);
  const [imageUploading, setImageUploading] = useState(false);
  const toast = useToast();

  // مدیریت گزینه‌ها به‌صورت آرایه
  const options = question.options ? question.options.split('|') : [];

  function updateOption(optIdx, value) {
    const newOpts = [...options];
    newOpts[optIdx] = value;
    onUpdate(idx, { options: newOpts.join('|') });
  }

  function addOption() {
    const newOpts = [...options, ''];
    onUpdate(idx, { options: newOpts.join('|'), correctOption: question.correctOption || 1 });
  }

  function removeOption(optIdx) {
    const newOpts = options.filter((_, i) => i !== optIdx);
    // اگر گزینه‌ی حذف‌شده قبل از correctOption بود، correctOption را کاهش بده
    let newCorrect = question.correctOption;
    if (newCorrect > optIdx + 1) {
      newCorrect = newCorrect - 1;
    } else if (newCorrect === optIdx + 1) {
      newCorrect = 1;
    }
    onUpdate(idx, { options: newOpts.join('|'), correctOption: newCorrect });
  }

  function toggleCorrect(optIdx) {
    onUpdate(idx, { correctOption: optIdx + 1 });
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم عکس نباید بیشتر از ۲ مگابایت باشد');
      return;
    }
    setImageUploading(true);
    try {
      const base64 = await fileToBase64(file);
      onUpdate(idx, { imageUrl: base64 });
      toast.success('عکس بارگذاری شد');
    } catch {
      toast.error('خطا در بارگذاری عکس');
    } finally {
      setImageUploading(false);
    }
  }

  function removeImage() {
    onUpdate(idx, { imageUrl: null });
  }

  return (
    <div className="exam-question-card" data-tour="eb-question">
      <div className="exam-q-head">
        <span className="exam-q-num">سؤال {toFaDigits(idx + 1)}</span>
        <select
          value={question.type}
          onChange={(e) => onUpdate(idx, { type: e.target.value })}
          className="exam-q-type"
        >
          <option value="MULTIPLE_CHOICE">تستی (چهارگزینه‌ای)</option>
          <option value="DESCRIPTIVE">تشریحی</option>
        </select>
        <button
          type="button"
          className="btn-icon-only"
          onClick={() => onRemove(idx)}
          title="حذف سؤال"
        >
          <Ico e="✕" />
        </button>
      </div>

      {/* آپلود عکس سؤال */}
      <div className="question-image-section">
        {question.imageUrl ? (
          <div className="question-image-preview">
            <img src={question.imageUrl} alt="سؤال" />
            <button
              type="button"
              className="btn-icon-only image-remove"
              onClick={removeImage}
              title="حذف عکس"
            >
              <Ico e="🗑" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary image-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
          >
            {imageUploading ? <><Ico e="⏳" /> در حال بارگذاری…</> : <><Ico e="🖼" /> آپلود عکس سؤال</>}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* متن سؤال — اگر عکس آپلود شده، اختیاری */}
      <textarea
        rows={question.imageUrl ? 1 : 2}
        value={question.text || ''}
        onChange={(e) => onUpdate(idx, { text: e.target.value })}
        placeholder={question.imageUrl ? 'توضیح اضافی (اختیاری)...' : 'متن سؤال...'}
      />
      {question.imageUrl && (
        <span className="field-hint">چون عکس آپلود کرده‌ای، متن اختیاری است.</span>
      )}

      {/* گزینه‌ها — رابط کاربری ساده‌تر */}
      {question.type === 'MULTIPLE_CHOICE' && (
        <div className="options-section">
          <div className="options-header">
            <span className="options-title">گزینه‌ها</span>
            <span className="options-hint">روی دکمه‌ی کنار گزینه کلیک کن تا به‌عنوان صحیح انتخاب شود</span>
          </div>
          <div className="options-list">
            {options.map((opt, i) => (
              <OptionRow
                key={i}
                index={i}
                value={opt}
                isCorrect={question.correctOption === i + 1}
                onChange={updateOption}
                onRemove={removeOption}
                onToggleCorrect={toggleCorrect}
                canRemove={options.length > 2}
              />
            ))}
          </div>
          {options.length < 6 && (
            <button type="button" className="btn-secondary add-option-btn" onClick={addOption}>
              + افزودن گزینه
            </button>
          )}
        </div>
      )}

      <label className="points-label">
        نمره:
        <FaNumberInput
          decimals={2}
          value={question.points}
          onChange={(v) => onUpdate(idx, { points: v })}
        />
      </label>
    </div>
  );
}

// ----- کمک‌های پیش‌نویس خودکار -----
const BLANK_QUESTION = { id: null, type: 'MULTIPLE_CHOICE', text: '', options: '||', correctOption: 1, points: 1, imageUrl: null };

// مقدار اولیه‌ی همه‌ی فیلدهای فرم (بدون در نظر گرفتن پیش‌نویس)
function buildExamDefaults(existingExam, studentId) {
  return {
    selectedStudentIds: studentId ? [studentId] : [],
    title: existingExam?.title || '',
    description: existingExam?.description || '',
    scheduledDate: existingExam?.scheduledAt ? toDateOnly(existingExam.scheduledAt) : toDateOnly(new Date()),
    scheduledTime: existingExam?.scheduledAt ? toTimeOnly(existingExam.scheduledAt) : '09:00',
    durationMinutes: existingExam?.durationMinutes || 60,
    visibleToStudent: existingExam?.visibleToStudent || false,
    visibleFromDate: existingExam?.visibleFrom ? toDateOnly(existingExam.visibleFrom) : '',
    visibleFromTime: existingExam?.visibleFrom ? toTimeOnly(existingExam.visibleFrom) : '09:00',
    questions: existingExam?.questions?.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text || '',
      options: q.options || '',
      correctOption: q.correctOption || 1,
      points: q.points || 1,
      imageUrl: q.imageUrl || null,
    })) || [{ ...BLANK_QUESTION }],
  };
}

// عکس‌های تازه‌بارگذاری‌شده (base64) حجم زیادی دارند و جا در حافظه‌ی مرورگر نمی‌شود؛
// در پیش‌نویس نگه داشته نمی‌شوند. عکس‌هایی که از قبل روی سرور هستند (آدرس) می‌مانند.
function stripLocalImages(questions) {
  return questions.map((q) =>
    q.imageUrl && String(q.imageUrl).startsWith('data:') ? { ...q, imageUrl: null } : q
  );
}

function isValidExamSnapshot(d) {
  return !!d && typeof d.title === 'string' && Array.isArray(d.questions) && d.questions.length > 0
    && Array.isArray(d.selectedStudentIds);
}

// کامپوننت اصلی
export default function ExamBuilder({ studentId, students = [], existingExam, onSaved, onCancel }) {
  const { auth } = useAuth();
  const userId = auth?.user?.id;

  // ----- پیش‌نویس خودکار: با رفرش یا بسته‌شدن صفحه، نوشته‌ها از بین نمی‌روند -----
  const scope = `exam:${studentId}:${existingExam ? existingExam.id : 'new'}`;
  const key = userId ? draftKey(userId, scope) : null;
  const examStamp = existingExam?.updatedAt || null;

  const [defaults] = useState(() => buildExamDefaults(existingExam, studentId));
  const [defaultsSig] = useState(() => JSON.stringify(defaults));
  const [saved] = useState(() => {
    const d = key ? readDraft(key) : null;
    return d && isValidExamSnapshot(d.data) ? d : null;
  });
  // اگر آزمون بعد از ذخیره‌ی پیش‌نویس روی سرور عوض شده باشد، بی‌صدا جایگزینش نمی‌کنیم
  const conflict = !!saved && !!existingExam && (saved.meta?.examStamp ?? null) !== examStamp;
  const [notice, setNotice] = useState(saved ? (conflict ? 'conflict' : 'restored') : null);
  const init = saved && !conflict ? { ...defaults, ...saved.data } : defaults;

  // حالت گروهی: انتخاب چند دانش‌آموز (فقط برای آزمون جدید)
  const [selectedStudentIds, setSelectedStudentIds] = useState(init.selectedStudentIds);
  const [studentSearch, setStudentSearch] = useState('');
  const [title, setTitle] = useState(init.title);
  const [description, setDescription] = useState(init.description);
  const [scheduledDate, setScheduledDate] = useState(init.scheduledDate);
  const [scheduledTime, setScheduledTime] = useState(init.scheduledTime);
  const [durationMinutes, setDurationMinutes] = useState(init.durationMinutes);
  const [visibleToStudent, setVisibleToStudent] = useState(init.visibleToStudent);
  const [visibleFromDate, setVisibleFromDate] = useState(init.visibleFromDate);
  const [visibleFromTime, setVisibleFromTime] = useState(init.visibleFromTime);
  const [questions, setQuestions] = useState(init.questions);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const snapshot = useMemo(
    () => ({
      selectedStudentIds, title, description, scheduledDate, scheduledTime, durationMinutes,
      visibleToStudent, visibleFromDate, visibleFromTime, questions: stripLocalImages(questions),
    }),
    [selectedStudentIds, title, description, scheduledDate, scheduledTime, durationMinutes,
      visibleToStudent, visibleFromDate, visibleFromTime, questions]
  );
  const dirty = useMemo(() => JSON.stringify(snapshot) !== defaultsSig, [snapshot, defaultsSig]);
  const droppedImages = questions.some((q) => q.imageUrl && String(q.imageUrl).startsWith('data:'));
  const { discard } = useDraft({
    key,
    data: snapshot,
    meta: { examStamp, droppedImages },
    dirty,
    enabled: notice !== 'conflict',
  });

  function applySnapshot(snap) {
    setSelectedStudentIds(snap.selectedStudentIds);
    setTitle(snap.title);
    setDescription(snap.description);
    setScheduledDate(snap.scheduledDate);
    setScheduledTime(snap.scheduledTime);
    setDurationMinutes(snap.durationMinutes);
    setVisibleToStudent(snap.visibleToStudent);
    setVisibleFromDate(snap.visibleFromDate);
    setVisibleFromTime(snap.visibleFromTime);
    setQuestions(snap.questions);
  }
  function handleResetDraft() {
    applySnapshot(defaults);
    setNotice(null);
  }
  function handleRestoreConflict() {
    applySnapshot({ ...defaults, ...saved.data });
    setNotice('restored');
  }
  function handleDeleteConflict() {
    if (key) clearDraft(key);
    setNotice(null);
  }
  function handleCancel() {
    discard();
    onCancel();
  }

  // دانش‌آموزهای فیلترشده بر اساس جستجو
  const filteredStudents = students.filter((s) =>
    (s.fullName || '').includes(studentSearch.trim())
  );

  function updateQuestion(idx, patch) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { id: null, type: 'MULTIPLE_CHOICE', text: '', options: '||', correctOption: 1, points: 1, imageUrl: null },
    ]);
  }

  function removeQuestion(idx) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function validate() {
    if (!title.trim()) return 'عنوان آزمون را وارد کن';
    if (selectedStudentIds.length === 0) return 'حداقل یک دانش‌آموز انتخاب کن';
    if (!scheduledDate) return 'تاریخ شروع را انتخاب کن';
    if (!scheduledTime) return 'ساعت شروع را کامل وارد کن (مثلاً ۰۹:۳۰)';
    if (!visibleToStudent && visibleFromDate && !visibleFromTime) return 'ساعت نمایش را کامل وارد کن (مثلاً ۰۹:۰۰)';
    const mins = Number(durationMinutes);
    if (!Number.isInteger(mins) || mins < 1 || mins > 600) {
      return 'مدت آزمون باید بین ۱ و ۶۰۰ دقیقه باشد';
    }
    if (questions.length === 0) return 'حداقل یک سؤال وارد کن';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const hasText = q.text && q.text.trim();
      const hasImage = q.imageUrl;
      if (!hasText && !hasImage) return `سؤال ${i + 1} باید متن یا عکس داشته باشد`;
      if (q.type === 'MULTIPLE_CHOICE') {
        const opts = (q.options || '').split('|').map((s) => s.trim()).filter(Boolean);
        if (opts.length < 2) return `سؤال ${i + 1} باید حداقل ۲ گزینه داشته باشد`;
        if (q.correctOption < 1 || q.correctOption > opts.length) {
          return `گزینه‌ی صحیح سؤال ${i + 1} معتبر نیست`;
        }
      }
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    try {
      const scheduledAtISO = combineDateTime(scheduledDate, scheduledTime);
      const visibleFromISO = visibleToStudent
        ? null
        : (visibleFromDate ? combineDateTime(visibleFromDate, visibleFromTime) : null);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        // حالت گروهی: آرایه — تک‌دانش‌آموزی: یک id
        ...(selectedStudentIds.length > 1
          ? { studentIds: selectedStudentIds }
          : { studentId: selectedStudentIds[0] }),
        scheduledAt: scheduledAtISO,
        durationMinutes: Number(durationMinutes),
        visibleToStudent,
        visibleFrom: visibleFromISO,
        questions: questions.map((q) => ({
          type: q.type,
          text: q.text ? q.text.trim() : null,
          options: q.type === 'MULTIPLE_CHOICE' ? q.options : null,
          correctOption: q.type === 'MULTIPLE_CHOICE' ? Number(q.correctOption) : null,
          points: Number(q.points) || 1,
          imageUrl: q.imageUrl || null,
        })),
      };

      const data = existingExam
        ? await updateExam(existingExam.id, payload)
        : await createExam(payload);

      // حالت گروهی چند آزمون برمی‌گرداند؛ تک‌دانش‌آموزی یک آزمون
      discard();
      onSaved(data.exams && data.exams.length > 1 ? data.exams : data.exam);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // تشخیص نوع آزمون برای نمایش باج
  const hasDescriptive = questions.some((q) => q.type === 'DESCRIPTIVE');
  const allMultipleChoice = questions.every((q) => q.type === 'MULTIPLE_CHOICE');

  return (
    <form className="exam-builder" onSubmit={handleSubmit}>
      <div className="builder-head">
        <h3>{existingExam ? <><Ico e="✎" /> ویرایش آزمون</> : <><Ico e="📝" /> ساخت آزمون جدید</>}</h3>
      </div>

      {notice && (
        <DraftNotice
          variant={notice}
          savedAt={saved?.savedAt}
          extra={saved?.meta?.droppedImages ? 'عکس‌های سؤال‌ها در پیش‌نویس ذخیره نمی‌شوند؛ اگر عکسی داشتی دوباره اضافه‌اش کن.' : ''}
          onReset={handleResetDraft}
          onRestore={handleRestoreConflict}
          onDelete={handleDeleteConflict}
        />
      )}

      {/* انتخاب دانش‌آموز(ها) — فقط برای آزمون جدید؛ در ویرایش ثابت است */}
      <div className="students-picker-section" data-tour="eb-students">
        <div className="students-picker-head">
          <span className="builder-field-title">
            دانش‌آموز{selectedStudentIds.length > 1 ? `ها (${toFaDigits(selectedStudentIds.length)})` : ''}
          </span>
          {!existingExam && students.length > 0 && (
            <div className="students-picker-tools">
              <input
                type="text"
                className="students-picker-search"
                placeholder="جستجوی نام…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <button
                type="button"
                className="btn-chip"
                onClick={() =>
                  setSelectedStudentIds(
                    filteredStudents.length === students.length
                      ? students.map((s) => s.id)
                      : filteredStudents.map((s) => s.id)
                  )
                }
              >
                {filteredStudents.length === students.length ? 'انتخاب همه' : 'انتخاب نتایج'}
              </button>
              <button
                type="button"
                className="btn-chip"
                onClick={() => setSelectedStudentIds([])}
                disabled={selectedStudentIds.length === 0}
              >
                پاک کردن
              </button>
            </div>
          )}
        </div>

        {existingExam ? (
          <input type="text" value="دانش‌آموز این آزمون (قابل تغییر نیست)" disabled />
        ) : students.length === 0 ? (
          <p className="muted-text">دانش‌آموزی برای انتخاب وجود ندارد</p>
        ) : (
          <div className="students-picker-grid">
            {filteredStudents.map((s) => {
              const checked = selectedStudentIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`student-pick-card ${checked ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedStudentIds((prev) =>
                        e.target.checked
                          ? [...prev, s.id]
                          : prev.filter((id) => id !== s.id)
                      )
                    }
                  />
                  <span className="student-pick-avatar">
                    {String(s.fullName || '?').trim().charAt(0)}
                  </span>
                  <span className="student-pick-name">{s.fullName}</span>
                  <span className="student-pick-check" aria-hidden><Ico e="✓" /></span>
                </label>
              );
            })}
            {filteredStudents.length === 0 && (
              <p className="muted-text">نتیجه‌ای برای «{studentSearch}» پیدا نشد</p>
            )}
          </div>
        )}
        {!existingExam && (
          <span className="field-hint">
            می‌توانی همین آزمون را همزمان برای چند دانش‌آموز بسازی — هرکدام نسخه‌ی مستقل خودش را می‌گیرد
          </span>
        )}
      </div>

      <div className="builder-row" data-tour="eb-title-row">
        <label className="builder-field">
          <span>عنوان آزمون</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً آزمون فصل ۳ ریاضی"
            required
          />
        </label>
        <label className="builder-field">
          <span>مدت (دقیقه)</span>
          <FaNumberInput
            value={durationMinutes}
            onChange={(v) => setDurationMinutes(v)}
            required
          />
        </label>
      </div>

      <div className="builder-row" data-tour="eb-when">
        <div className="builder-field">
          <span><Ico e="📅" /> تاریخ شروع آزمون</span>
          <JalaliDatePicker
            value={scheduledDate}
            onChange={(v) => setScheduledDate(v)}
            placeholder="انتخاب تاریخ"
          />
        </div>
        <label className="builder-field">
          <span><Ico e="⏰" /> ساعت شروع</span>
          <TimeInput
            value={scheduledTime}
            onChange={setScheduledTime}
          />
          <span className="field-hint">دانش‌آموز نمی‌تواند قبل از این زمان آزمون را شروع کند</span>
        </label>
      </div>

      <label className="builder-field">
        <span>توضیح (اختیاری)</span>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="توضیح درباره‌ی آزمون..."
        />
      </label>

      <div className="visibility-section" data-tour="eb-visibility">
        <label className="visibility-toggle">
          <input
            type="checkbox"
            checked={visibleToStudent}
            onChange={(e) => setVisibleToStudent(e.target.checked)}
          />
          <span>
            {visibleToStudent ? (
              <><Ico e="🔍" /> آزمون فوراً برای دانش‌آموز نمایش داده می‌شود</>
            ) : (
              <><Ico e="🔒" /> آزمون مخفی است تا زمان مشخص‌شده</>
            )}
          </span>
        </label>

        {!visibleToStudent && (
          <div className="visible-from-section">
            <p className="visible-from-hint">
              زمانی که آزمون برای دانش‌آموز نمایش داده می‌شود (اگر خالی بگذاری، تا زمان شروع آزمون مخفی می‌ماند):
            </p>
            <div className="builder-row">
              <div className="builder-field">
                <span><Ico e="📅" /> تاریخ نمایش</span>
                <JalaliDatePicker
                  value={visibleFromDate}
                  onChange={(v) => setVisibleFromDate(v)}
                  placeholder="اختیاری (پیش‌فرض: زمان شروع)"
                />
              </div>
              <label className="builder-field">
                <span><Ico e="⏰" /> ساعت نمایش</span>
                <TimeInput
                  value={visibleFromTime}
                  onChange={setVisibleFromTime}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="exam-questions-section" data-tour="eb-questions">
        <div className="section-head">
          <h4>سؤالات ({toFaDigits(questions.length)})</h4>
          <button type="button" className="btn-secondary" onClick={addQuestion}>
            + افزودن سؤال
          </button>
        </div>

        {questions.map((q, idx) => (
          <QuestionCard
            key={idx}
            question={q}
            idx={idx}
            onUpdate={updateQuestion}
            onRemove={removeQuestion}
          />
        ))}
      </div>

      <div className="auto-grade-info">
        {allMultipleChoice ? (
          <span className="auto-grade-badge auto"><Ico e="✅" /> این آزمون فقط تستی است — نمره پس از ارسال خودکار ثبت می‌شود</span>
        ) : hasDescriptive ? (
          <span className="auto-grade-badge mixed"><Ico e="🔄" /> این آزمون ترکیبی است — سؤالات تستی خودکار، تشریحی دستی نمره می‌گیرند</span>
        ) : (
          <span className="auto-grade-badge manual"><Ico e="📝" /> این آزمون فقط تشریحی است — نیاز به نمره‌دهی دستی دارد</span>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span><Ico e="⚠" /></span> {error}
        </div>
      )}

      <div className="builder-actions" data-tour="eb-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'در حال ذخیره…' : existingExam ? 'ذخیره‌ی تغییرات' : 'ساخت آزمون'}
        </button>
        <button type="button" className="btn-secondary" onClick={handleCancel}>
          انصراف
        </button>
      </div>
    </form>
  );
}
