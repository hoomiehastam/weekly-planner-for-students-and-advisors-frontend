import { useEffect, useMemo, useState } from 'react';
import { fetchStudentExamEvents, createExamDrafts } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatJalaliShort, toFaDigits } from '../../utils/jalali';
import JalaliDatePicker from '../JalaliDatePicker';
import Ico from '../Ico';

function toLocalYmd(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// ظهر همان روز محلی تا تبدیل به UTC روز را عوض نکند
const ymdToIso = (ymd) => new Date(`${ymd}T12:00:00`).toISOString();
const dayKey = (iso) => toLocalYmd(iso);

const KIND_LABEL = { EXAM: 'امتحان', QUIZ: 'پرسش' };

// پنجره‌ی «ساخت برنامه از بازه‌ی امتحان‌ها» (پنل مشاور، بخش امتحان‌های مدرسه).
// مشاور بازه‌ی روزهای امتحان را انتخاب می‌کند؛ امتحان‌های ثبت‌شده‌ی دانش‌آموز در آن بازه فهرست می‌شود
// (می‌تواند بعضی را کنار بگذارد). سرور برای هر هفته یک «پیش‌نویس» می‌سازد که در بخش برنامه‌ها
// ویرایش و بعد منتشر می‌شود؛ تا انتشار، دانش‌آموز آن را نمی‌بیند.
export default function ExamRangePlanModal({ studentId, studentName, onClose, onCreated }) {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => toLocalYmd(new Date()));
  const [to, setTo] = useState(() => toLocalYmd(new Date(Date.now() + 14 * 86400000)));
  const [unchecked, setUnchecked] = useState(() => new Set());
  const [minutes, setMinutes] = useState(90);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    fetchStudentExamEvents(studentId)
      .then((d) => setEvents(d.events || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const inRange = useMemo(
    () => events.filter((e) => dayKey(e.dueAt) >= from && dayKey(e.dueAt) <= to),
    [events, from, to]
  );
  const selected = inRange.filter((e) => !unchecked.has(e.id));
  const totalBlocks = selected.reduce((n, e) => n + (e.neededSessions || 1), 0);
  const rangeInvalid = !from || !to || to < from;

  function toggle(id) {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    setBusy(true);
    setWarnings([]);
    try {
      const d = await createExamDrafts({
        studentId,
        from: ymdToIso(from),
        to: ymdToIso(to),
        eventIds: selected.map((e) => e.id),
        sessionMinutes: minutes,
      });
      if (d.warnings?.length) toast.warning(d.warnings[0]);
      onCreated(d);
    } catch (err) {
      setWarnings(err.message ? [err.message] : []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="dz-modal exam-range-modal" role="dialog" aria-modal="true" aria-labelledby="erm-title" onClick={(e) => e.stopPropagation()}>
        <div className="dz-modal-head">
          <h3 id="erm-title"><Ico e="🗓" /> ساخت برنامه از بازه‌ی امتحان‌ها</h3>
          <button type="button" className="btn-icon-only" onClick={onClose} aria-label="بستن"><Ico e="✕" /></button>
        </div>

        <p className="muted-text">
          بازه‌ی روزهای امتحان {studentName ? `«${studentName}»` : 'دانش‌آموز'} را انتخاب کن. برای هر امتحان، به تعداد
          «بازه‌های لازم» که دانش‌آموز تخمین زده بلوک مطالعه در روزهای قبل از امتحان چیده می‌شود
          و برای هر هفته یک <strong>پیش‌نویس</strong> ساخته می‌شود تا قبل از انتشار ببینی و ویرایش کنی.
        </p>

        <div className="erm-dates">
          <JalaliDatePicker label="از تاریخ" value={from} onChange={(v) => { setFrom(v); setUnchecked(new Set()); }} />
          <JalaliDatePicker label="تا تاریخ" value={to} onChange={(v) => { setTo(v); setUnchecked(new Set()); }} />
        </div>
        {rangeInvalid && <div className="alert alert-error">پایان بازه نمی‌تواند قبل از شروع آن باشد.</div>}

        <div className="erm-list">
          <strong>امتحان‌ها و پرسش‌های داخل بازه</strong>
          {loading ? (
            <p className="muted-text">در حال بارگذاری…</p>
          ) : inRange.length === 0 ? (
            <p className="muted-text">در این بازه چیزی ثبت نشده. از دانش‌آموز بخواه امتحان‌هایش را در پنل خودش ثبت کند.</p>
          ) : (
            <ul>
              {inRange.map((e) => (
                <li key={e.id}>
                  <label className="erm-item">
                    <input type="checkbox" checked={!unchecked.has(e.id)} onChange={() => toggle(e.id)} />
                    <span className="erm-item-main">
                      <b>{e.title}</b>
                      <small>
                        {KIND_LABEL[e.kind] || ''} · {formatJalaliShort(e.dueAt)}
                        {' · '}{e.neededSessions ? `${toFaDigits(e.neededSessions)} بلوک` : 'بلوک ثبت نشده (۱ بلوک)'}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="erm-minutes">
          طول هر بلوک مطالعه
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            <option value={60}>{toFaDigits(60)} دقیقه</option>
            <option value={90}>{toFaDigits(90)} دقیقه</option>
            <option value={120}>{toFaDigits(120)} دقیقه</option>
          </select>
        </label>

        {warnings.map((w) => (
          <div key={w} className="alert alert-error"><span><Ico e="⚠" /></span> {w}</div>
        ))}

        <div className="dz-modal-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || rangeInvalid || selected.length === 0}
            onClick={handleCreate}
          >
            {busy ? 'در حال ساخت…' : `ساخت پیش‌نویس (${toFaDigits(totalBlocks)} بلوک)`}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
}
