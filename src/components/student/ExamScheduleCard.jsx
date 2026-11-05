import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toFaDigits, formatJalaliShort } from '../../utils/jalali';
import {
  fetchStudentExamEvents,
  createMyExamEvent,
  updateMyExamEvent,
  deleteMyExamEvent,
} from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Ico from '../Ico';
import ConfirmModal from '../ConfirmModal';
import JalaliDatePicker from '../JalaliDatePicker';
import FaNumberInput from '../FaNumberInput';

// تاریخ محلی به‌صورت YYYY-MM-DD (نه UTC) تا نزدیک نیمه‌شب یک روز جابه‌جا نشود
function toLocalYmd(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ظهر همان روز محلی؛ با این کار تبدیل به UTC و برگشت، روز را عوض نمی‌کند
function ymdToIso(ymd) {
  return new Date(`${ymd}T12:00:00`).toISOString();
}

// شروع روزِ امروز (محلی) — برای تفکیک «پیش‌رو» و «گذشته»
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// تعداد روز مانده تا تاریخ (امروز = ۰، فردا = ۱، دیروز = -۱)
function daysUntil(iso) {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

function countdownLabel(iso) {
  const diff = daysUntil(iso);
  if (diff < 0) return `${toFaDigits(Math.abs(diff))} روز پیش`;
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'فردا';
  return `${toFaDigits(diff)} روز مانده`;
}

const KIND_LABEL = { EXAM: 'امتحان', QUIZ: 'پرسش' };
const KIND_ICON = { EXAM: '📝', QUIZ: '❓' };

// ====== برنامه‌ی امتحان‌ها و پرسش‌های مدرسه ======
// دانش‌آموز خودش ثبت می‌کند چه روزی چه امتحان یا پرسشی دارد (مدرسه/آموزشگاه).
// مشاور و والد همین فهرست را فقط‌خواندنی می‌بینند تا برنامه‌ریزی را با آن هم‌تراز کنند.
//
// props:
//   studentId — شناسه‌ی دانش‌آموز
//   canEdit   — فقط در پنل دانش‌آموز true می‌شود (و سرور هم باید SELF بگوید)
//   compact   — نمایش خلاصه‌تر (پنل مشاور/والد)
export default function ExamScheduleCard({ studentId, canEdit = false, compact = false }) {
  const [events, setEvents] = useState(null); // null یعنی هنوز لود نشده
  const [access, setAccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    kind: 'EXAM',
    subject: '',
    dueAt: '',
    note: '',
    neededSessions: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();
  const formRef = useRef(null);
  const titleInputRef = useRef(null);

  const editable = canEdit && access === 'SELF';

  const load = useCallback(async () => {
    try {
      const data = await fetchStudentExamEvents(studentId);
      setEvents(data.events || []);
      setAccess(data.access || null);
      setError('');
    } catch (err) {
      setError(err.message);
      setEvents([]);
    }
  }, [studentId]);

  useEffect(() => {
     
    load();
  }, [load]);

  // در گوشی فرمِ ثبت/ویرایش زیرِ فهرستِ بلند باز می‌شود و بیرون از کادر دید است؛
  // بدون این کار کاربر روی «مورد جدید» می‌زند و ظاهراً هیچ اتفاقی نمی‌افتد.
  // اگر فرم از قبل تقریباً در دید است، صفحه را بی‌دلیل جابه‌جا نمی‌کنیم.
  useEffect(() => {
    if (!showForm) return undefined;
    const timer = setTimeout(() => {
      const el = formRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < 0 || rect.top > viewport * 0.6) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // فقط در «ثبت جدید» فوکوس می‌دهیم تا کیبورد بلافاصله برای نوشتن عنوان باز شود
      if (!editingId) titleInputRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [showForm, editingId]);

  // پیش‌رو و گذشته را جدا نشان می‌دهیم (گذشته در انتها، کم‌رنگ)
  const { upcoming, past } = useMemo(() => {
    const list = events || [];
    const today = startOfToday().getTime();
    const up = list.filter((e) => new Date(e.dueAt).setHours(0, 0, 0, 0) >= today);
    const old = list.filter((e) => new Date(e.dueAt).setHours(0, 0, 0, 0) < today);
    // گذشته را از تازه‌ترین به قدیمی‌ترین نشان می‌دهیم
    old.reverse();
    return { upcoming: up, past: old };
  }, [events]);

  // تور راهنما می‌تواند فرم ثبت را باز/بسته کند تا فیلدها را نشان بدهد
  useEffect(() => {
    if (!editable || compact) return undefined;
    const onTourForm = (e) => {
      if (e.detail?.form === 'school-form') {
        startCreate();
        e.detail.ok = true;
      } else if (e.detail?.form === null && showForm) {
        resetForm();
      }
    };
    window.addEventListener('dz:tourform', onTourForm);
    return () => window.removeEventListener('dz:tourform', onTourForm);
  });

  function resetForm() {
    setForm({ title: '', kind: 'EXAM', subject: '', dueAt: '', note: '', neededSessions: '' });
    setShowForm(false);
    setEditingId(null);
    setError('');
  }

  function startCreate() {
    setForm({ title: '', kind: 'EXAM', subject: '', dueAt: toLocalYmd(new Date()), note: '', neededSessions: '' });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(event) {
    setForm({
      title: event.title,
      kind: event.kind || 'EXAM',
      subject: event.subject || '',
      dueAt: toLocalYmd(new Date(event.dueAt)),
      note: event.note || '',
      neededSessions: event.neededSessions != null ? String(event.neededSessions) : '',
    });
    setEditingId(event.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('عنوان امتحان یا پرسش الزامی است');
      return;
    }
    if (!form.dueAt) {
      setError('تاریخ برگزاری الزامی است');
      return;
    }

    const payload = {
      title: form.title.trim(),
      kind: form.kind,
      dueAt: ymdToIso(form.dueAt),
      ...(form.subject.trim() ? { subject: form.subject.trim() } : { subject: null }),
      ...(form.note.trim() ? { note: form.note.trim() } : { note: null }),
      // خالی → null یعنی «نظری نداده»؛ عدد با ارقام لاتین فرستاده می‌شود
      neededSessions: form.neededSessions === '' ? null : Number(form.neededSessions),
    };

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const data = await updateMyExamEvent(editingId, payload);
        toast.success(data.message || 'به‌روزرسانی شد');
      } else {
        const data = await createMyExamEvent(payload);
        toast.success(data.message || 'ثبت شد');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteMyExamEvent(confirmDelete.id);
      toast.success('مورد حذف شد');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function renderRow(event) {
    const days = daysUntil(event.dueAt);
    const tone = days < 0 ? 'past' : days <= 2 ? 'soon' : 'upcoming';
    return (
      <div key={event.id} className={`exam-schedule-row is-${tone}`}>
        <span className={`exam-schedule-kind kind-${(event.kind || 'EXAM').toLowerCase()}`}>
          <Ico e={KIND_ICON[event.kind] || '📝'} />
          {KIND_LABEL[event.kind] || 'امتحان'}
        </span>
        <div className="exam-schedule-main">
          <strong className="exam-schedule-title">{event.title}</strong>
          <div className="exam-schedule-meta">
            <span className="exam-schedule-date">
              <Ico e="📅" /> {formatJalaliShort(new Date(event.dueAt))}
            </span>
            {event.subject && <span className="exam-schedule-subject">{event.subject}</span>}
            {/* تخمین خودِ دانش‌آموز از تعداد بازه‌ی لازم — مشاور با همین عدد
                می‌داند این امتحان چند بلوک از برنامه را باید اشغال کند. */}
            {event.neededSessions != null && (
              <span
                className="exam-schedule-sessions"
                title="تخمین دانش‌آموز از تعداد بازه‌ی مطالعه‌ی لازم برای این مورد"
              >
                <Ico e="📚" />{' '}
                {compact
                  ? `${toFaDigits(event.neededSessions)} بازه‌ی مطالعه لازم دارد`
                  : `${toFaDigits(event.neededSessions)} بازه`}
              </span>
            )}
          </div>
          {event.note && <p className="exam-schedule-note">{event.note}</p>}
        </div>
        <span className={`exam-schedule-countdown tone-${tone}`}>
          {countdownLabel(event.dueAt)}
        </span>
        {editable && (
          <div className="exam-schedule-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => startEdit(event)}
              aria-label="ویرایش"
            >
              <Ico e="✏" />
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setConfirmDelete(event)}
              aria-label="حذف"
            >
              <Ico e="🗑" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stat-card card exam-schedule-card">
      <div className="section-head mock-head">
        <h3 className="section-title">
          <span className="section-emoji">
            <Ico e="📌" />
          </span>
          {editable ? 'امتحان‌ها و پرسش‌های من' : 'امتحان‌ها و پرسش‌های مدرسه'}
        </h3>
        {editable && !compact && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={showForm ? resetForm : startCreate}
          >
            {showForm ? 'بستن' : '+ مورد جدید'}
          </button>
        )}
      </div>

      {/* خطای بارگذاری بالای کارت؛ خطای ثبت/ویرایش داخل خودِ فرم نشان داده می‌شود
          (در گوشی کاربر پایین صفحه است و این ناحیه را نمی‌بیند) */}
      {error && !showForm && (
        <div className="alert alert-error">
          <span>
            <Ico e="⚠" />
          </span>{' '}
          {error}
        </div>
      )}

      {!events ? (
        <p className="muted">در حال بارگذاری…</p>
      ) : events.length === 0 ? (
        <p className="muted">
          {editable
            ? 'هنوز امتحان یا پرسشی ثبت نکرده‌ای. تاریخ امتحان‌های مدرسه را اینجا بنویس تا مشاورت برنامه را با آن هم‌تراز کند.'
            : 'هنوز امتحان یا پرسشی ثبت نشده است.'}
        </p>
      ) : (
        <div className="exam-schedule-list">
          {upcoming.length > 0 && (
            <div className="exam-schedule-group">
              <span className="exam-schedule-group-title">پیش‌رو</span>
              {upcoming.map(renderRow)}
            </div>
          )}
          {past.length > 0 && (
            <div className="exam-schedule-group is-past">
              <span className="exam-schedule-group-title">گذشته</span>
              {past.map(renderRow)}
            </div>
          )}
        </div>
      )}

      {editable && !compact && showForm && (
        <form className="mock-exam-form" onSubmit={handleSubmit} ref={formRef}>
          {editingId && (
            <p className="exam-schedule-editing-hint">
              <Ico e="✏" /> در حال ویرایش مورد ثبت‌شده — بعد از تغییر، «ذخیره‌ی تغییرات» را بزن.
            </p>
          )}

          <div className="exam-kind-toggle" role="group" aria-label="نوع مورد" data-tour="sf-kind">
            {['EXAM', 'QUIZ'].map((k) => (
              <button
                key={k}
                type="button"
                className={`exam-kind-btn ${form.kind === k ? 'active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, kind: k }))}
              >
                <Ico e={KIND_ICON[k]} /> {KIND_LABEL[k]}
              </button>
            ))}
          </div>

          <div className="mock-form-grid">
            <label className="field-label" data-tour="sf-title">
              عنوان
              <input
                type="text"
                ref={titleInputRef}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثلاً امتحان ریاضی نوبت اول"
                maxLength={190}
                required
              />
            </label>
            <div className="field-label" data-tour="sf-date">
              تاریخ برگزاری
              <JalaliDatePicker
                value={form.dueAt}
                onChange={(val) => setForm((f) => ({ ...f, dueAt: val }))}
              />
            </div>
            <label className="field-label" data-tour="sf-subject">
              درس (اختیاری)
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="مثلاً ریاضی ۲"
                maxLength={60}
              />
            </label>
            <label className="field-label" data-tour="sf-sessions">
              چند بازه لازم داری؟ (اختیاری)
              <FaNumberInput
                value={form.neededSessions}
                onChange={(val) => setForm((f) => ({ ...f, neededSessions: val }))}
                placeholder="مثلاً ۴"
                dir="ltr"
                maxLength={2}
              />
              <span className="field-hint">
                تخمین خودت از تعداد بازه‌های مطالعه‌ای که برای آماده‌شدن برای این مورد لازم داری —
                مشاورت برنامه‌ی هفتگی را با همین عدد می‌بندد.
              </span>
            </label>
          </div>

          <label className="field-label" data-tour="sf-note">
            توضیح (اختیاری)
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="مثلاً فصل ۱ تا ۴ — نمره‌دار"
              maxLength={500}
            />
          </label>

          {error && (
            <div className="alert alert-error">
              <span>
                <Ico e="⚠" />
              </span>{' '}
              {error}
            </div>
          )}

          <div className="mock-form-actions" data-tour="sf-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره…' : editingId ? 'ذخیره‌ی تغییرات' : 'ثبت'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              انصراف
            </button>
          </div>
        </form>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`مورد «${confirmDelete.title}» حذف شود؟`}
          confirmText="بله، حذف کن"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
